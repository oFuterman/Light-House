package notifier

import (
    "bytes"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "net/smtp"
    "time"

    "github.com/oFuterman/light-house/internal/config"
    "github.com/oFuterman/light-house/internal/models"
    "github.com/sendgrid/sendgrid-go"
    "github.com/sendgrid/sendgrid-go/helpers/mail"
    "gorm.io/gorm"
)

var cfg *config.Config

// Init initializes the notifier with config
func Init(c *config.Config) {
    cfg = c
}

// WebhookPayload is the JSON structure sent to webhooks
type WebhookPayload struct {
    CheckID      uint             `json:"check_id"`
    CheckName    string           `json:"check_name"`
    Event        models.AlertType `json:"event"`
    StatusCode   int              `json:"status_code"`
    ErrorMessage string           `json:"error_message,omitempty"`
    Timestamp    time.Time        `json:"timestamp"`
}

// SendAllNotifications loads settings and sends all configured notifications
func SendAllNotifications(db *gorm.DB, alert models.Alert, check models.Check) error {
    var settings models.NotificationSettings
    err := db.Where("org_id = ?", check.OrgID).First(&settings).Error
    if err != nil {
        if err == gorm.ErrRecordNotFound {
            log.Printf("No notification settings for org %d, skipping", check.OrgID)
            return nil
        }
        return fmt.Errorf("failed to load notification settings: %w", err)
    }
    var emailErr, webhookErr error
    // Send emails if recipients configured
    if len(settings.EmailRecipients) > 0 {
        emailErr = sendEmailAlert(settings, alert, check)
        if emailErr != nil {
            log.Printf("Email alert failed for check %d: %v", check.ID, emailErr)
        }
    }
    // Send webhook if URL configured
    if settings.WebhookURL != nil && *settings.WebhookURL != "" {
        webhookErr = sendWebhookAlert(*settings.WebhookURL, alert, check)
        if webhookErr != nil {
            log.Printf("Webhook alert failed for check %d: %v", check.ID, webhookErr)
        }
    }
    // Return error only if both failed (and both were configured)
    if emailErr != nil && webhookErr != nil {
        return fmt.Errorf("all notifications failed: email=%v, webhook=%v", emailErr, webhookErr)
    }
    return nil
}

// sendEmailAlert sends email to all recipients via SendGrid (prod) or SMTP/Mailpit (dev)
func sendEmailAlert(settings models.NotificationSettings, alert models.Alert, check models.Check) error {
    subject := fmt.Sprintf("[%s] %s is %s", alert.AlertType, check.Name, alert.AlertType)
    body := fmt.Sprintf("%s is %s", check.Name, alert.AlertType)
    if alert.StatusCode > 0 {
        body = fmt.Sprintf("%s (%d)", body, alert.StatusCode)
    }
    if alert.ErrorMessage != "" {
        body = fmt.Sprintf("%s\n\nError: %s", body, alert.ErrorMessage)
    }
    body = fmt.Sprintf("%s\n\nURL: %s\nTime: %s", body, check.URL, alert.CreatedAt.Format(time.RFC1123))
    // Production: use SendGrid
    if cfg.Environment == "production" {
        if cfg.SendGridKey == "" {
            return fmt.Errorf("SendGrid API key required in production")
        }
        return sendViaSendGrid(settings.EmailRecipients, subject, body)
    }
    // Development: use SMTP (Mailpit)
    if cfg.SMTPHost != "" {
        return sendViaSMTP(settings.EmailRecipients, subject, body)
    }
    // Fallback: try SendGrid if configured even in dev
    if cfg.SendGridKey != "" {
        return sendViaSendGrid(settings.EmailRecipients, subject, body)
    }
    return fmt.Errorf("no email provider configured (set SMTP_HOST for dev or SENDGRID_API_KEY)")
}

// sendViaSendGrid sends email using SendGrid API
func sendViaSendGrid(recipients []string, subject, body string) error {
    from := mail.NewEmail("Light House", cfg.SMTPFrom)
    for _, recipient := range recipients {
        to := mail.NewEmail("", recipient)
        message := mail.NewSingleEmail(from, subject, to, body, "")
        client := sendgrid.NewSendClient(cfg.SendGridKey)
        resp, err := client.Send(message)
        if err != nil {
            return fmt.Errorf("sendgrid error: %w", err)
        }
        if resp.StatusCode >= 400 {
            return fmt.Errorf("sendgrid returned status %d: %s", resp.StatusCode, resp.Body)
        }
        log.Printf("Email sent via SendGrid to %s", recipient)
    }
    return nil
}

// sendViaSMTP sends email using SMTP (supports Mailpit with no auth)
func sendViaSMTP(recipients []string, subject, body string) error {
    addr := fmt.Sprintf("%s:%s", cfg.SMTPHost, cfg.SMTPPort)
    // Use auth only if credentials are provided (Mailpit doesn't need auth)
    var auth smtp.Auth
    if cfg.SMTPUser != "" && cfg.SMTPPassword != "" {
        auth = smtp.PlainAuth("", cfg.SMTPUser, cfg.SMTPPassword, cfg.SMTPHost)
    }
    for _, recipient := range recipients {
        msg := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\n\r\n%s",
            cfg.SMTPFrom, recipient, subject, body)
        err := smtp.SendMail(addr, auth, cfg.SMTPFrom, []string{recipient}, []byte(msg))
        if err != nil {
            return fmt.Errorf("smtp error: %w", err)
        }
        log.Printf("Email sent via SMTP to %s", recipient)
    }
    return nil
}

// sendWebhookAlert POSTs JSON payload to the configured webhook URL
func sendWebhookAlert(webhookURL string, alert models.Alert, check models.Check) error {
    payload := WebhookPayload{
        CheckID:      check.ID,
        CheckName:    check.Name,
        Event:        alert.AlertType,
        StatusCode:   alert.StatusCode,
        ErrorMessage: alert.ErrorMessage,
        Timestamp:    alert.CreatedAt,
    }
    jsonData, err := json.Marshal(payload)
    if err != nil {
        return fmt.Errorf("failed to marshal webhook payload: %w", err)
    }
    client := &http.Client{Timeout: 10 * time.Second}
    resp, err := client.Post(webhookURL, "application/json", bytes.NewBuffer(jsonData))
    if err != nil {
        return fmt.Errorf("webhook request failed: %w", err)
    }
    defer resp.Body.Close()
    if resp.StatusCode >= 400 {
        return fmt.Errorf("webhook returned status %d", resp.StatusCode)
    }
    log.Printf("Webhook sent to %s (status %d)", webhookURL, resp.StatusCode)
    return nil
}
