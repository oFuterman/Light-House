package handlers

import (
    "regexp"
    "strings"

    "github.com/gofiber/fiber/v2"
    "github.com/lib/pq"
    "github.com/oFuterman/light-house/internal/models"
    "gorm.io/gorm"
)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

type NotificationSettingsRequest struct {
    EmailRecipients []string `json:"email_recipients"`
    WebhookURL      *string  `json:"webhook_url"`
}

type NotificationSettingsResponse struct {
    ID              uint     `json:"id"`
    EmailRecipients []string `json:"email_recipients"`
    WebhookURL      *string  `json:"webhook_url,omitempty"`
}

// validateEmails checks each email has valid format
func validateEmails(emails []string) ([]string, error) {
    validated := make([]string, 0, len(emails))
    for _, email := range emails {
        email = strings.TrimSpace(strings.ToLower(email))
        if email == "" {
            continue
        }
        if !emailRegex.MatchString(email) {
            return nil, fiber.NewError(fiber.StatusBadRequest, "invalid email: "+email)
        }
        validated = append(validated, email)
    }
    return validated, nil
}

// GetNotificationSettings returns the org's notification settings
func GetNotificationSettings(db *gorm.DB) fiber.Handler {
    return func(c *fiber.Ctx) error {
        orgID := c.Locals("orgID").(uint)
        var settings models.NotificationSettings
        err := db.Where("org_id = ?", orgID).First(&settings).Error
        if err != nil {
            if err == gorm.ErrRecordNotFound {
                // Return empty settings if none exist
                return c.JSON(NotificationSettingsResponse{
                    EmailRecipients: []string{},
                })
            }
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to fetch notification settings",
            })
        }
        return c.JSON(NotificationSettingsResponse{
            ID:              settings.ID,
            EmailRecipients: settings.EmailRecipients,
            WebhookURL:      settings.WebhookURL,
        })
    }
}

// UpdateNotificationSettings creates or updates the org's notification settings
func UpdateNotificationSettings(db *gorm.DB) fiber.Handler {
    return func(c *fiber.Ctx) error {
        orgID := c.Locals("orgID").(uint)
        var req NotificationSettingsRequest
        if err := c.BodyParser(&req); err != nil {
            return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
                "error": "invalid request body",
            })
        }
        // Validate emails
        validatedEmails, err := validateEmails(req.EmailRecipients)
        if err != nil {
            return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
                "error": err.Error(),
            })
        }
        // Validate webhook URL if provided
        if req.WebhookURL != nil {
            url := strings.TrimSpace(*req.WebhookURL)
            if url == "" {
                req.WebhookURL = nil
            } else if !strings.HasPrefix(url, "http://") && !strings.HasPrefix(url, "https://") {
                return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
                    "error": "webhook URL must start with http:// or https://",
                })
            } else {
                req.WebhookURL = &url
            }
        }
        // Upsert settings
        var settings models.NotificationSettings
        err = db.Where("org_id = ?", orgID).First(&settings).Error
        if err == gorm.ErrRecordNotFound {
            settings = models.NotificationSettings{
                OrgID:           orgID,
                EmailRecipients: pq.StringArray(validatedEmails),
                WebhookURL:      req.WebhookURL,
            }
            if err := db.Create(&settings).Error; err != nil {
                return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                    "error": "failed to create notification settings",
                })
            }
        } else if err != nil {
            return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                "error": "failed to fetch notification settings",
            })
        } else {
            settings.EmailRecipients = pq.StringArray(validatedEmails)
            settings.WebhookURL = req.WebhookURL
            if err := db.Save(&settings).Error; err != nil {
                return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
                    "error": "failed to update notification settings",
                })
            }
        }
        return c.JSON(NotificationSettingsResponse{
            ID:              settings.ID,
            EmailRecipients: settings.EmailRecipients,
            WebhookURL:      settings.WebhookURL,
        })
    }
}
