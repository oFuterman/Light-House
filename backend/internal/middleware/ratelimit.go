package middleware

import (
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
)

// RateLimitConfig holds configuration for rate limiting
type RateLimitConfig struct {
	// Max requests per window
	Max int
	// Window duration
	Window time.Duration
	// Key function to identify the client (returns key string)
	KeyFunc func(*fiber.Ctx) string
	// Skip function to conditionally skip rate limiting
	SkipFunc func(*fiber.Ctx) bool
}

// DefaultRateLimitConfig returns sensible defaults
func DefaultRateLimitConfig() RateLimitConfig {
	return RateLimitConfig{
		Max:    100,
		Window: time.Minute,
		KeyFunc: func(c *fiber.Ctx) string {
			return c.IP()
		},
		SkipFunc: nil,
	}
}

// rateLimitEntry tracks requests for a single key
type rateLimitEntry struct {
	count     int
	expiresAt time.Time
}

// rateLimitStore is an in-memory store for rate limit tracking
type rateLimitStore struct {
	mu      sync.RWMutex
	entries map[string]*rateLimitEntry
}

var store = &rateLimitStore{
	entries: make(map[string]*rateLimitEntry),
}

// cleanup removes expired entries periodically
func init() {
	go func() {
		ticker := time.NewTicker(time.Minute)
		for range ticker.C {
			store.mu.Lock()
			now := time.Now()
			for key, entry := range store.entries {
				if now.After(entry.expiresAt) {
					delete(store.entries, key)
				}
			}
			store.mu.Unlock()
		}
	}()
}

// RateLimit creates a rate limiting middleware
func RateLimit(config ...RateLimitConfig) fiber.Handler {
	cfg := DefaultRateLimitConfig()
	if len(config) > 0 {
		cfg = config[0]
	}

	return func(c *fiber.Ctx) error {
		// Check if should skip
		if cfg.SkipFunc != nil && cfg.SkipFunc(c) {
			return c.Next()
		}

		key := cfg.KeyFunc(c)
		now := time.Now()

		store.mu.Lock()
		entry, exists := store.entries[key]

		if !exists || now.After(entry.expiresAt) {
			// New window
			store.entries[key] = &rateLimitEntry{
				count:     1,
				expiresAt: now.Add(cfg.Window),
			}
			store.mu.Unlock()

			// Set rate limit headers
			c.Set("X-RateLimit-Limit", itoa(cfg.Max))
			c.Set("X-RateLimit-Remaining", itoa(cfg.Max-1))
			c.Set("X-RateLimit-Reset", itoa(int(now.Add(cfg.Window).Unix())))

			return c.Next()
		}

		entry.count++
		remaining := cfg.Max - entry.count
		store.mu.Unlock()

		// Set rate limit headers
		c.Set("X-RateLimit-Limit", itoa(cfg.Max))
		c.Set("X-RateLimit-Remaining", itoa(max(0, remaining)))
		c.Set("X-RateLimit-Reset", itoa(int(entry.expiresAt.Unix())))

		if remaining < 0 {
			c.Set("Retry-After", itoa(int(entry.expiresAt.Sub(now).Seconds())))
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error":       "rate limit exceeded",
				"retry_after": int(entry.expiresAt.Sub(now).Seconds()),
			})
		}

		return c.Next()
	}
}

// RateLimitByIP creates a rate limiter keyed by IP address
func RateLimitByIP(max int, window time.Duration) fiber.Handler {
	return RateLimit(RateLimitConfig{
		Max:    max,
		Window: window,
		KeyFunc: func(c *fiber.Ctx) string {
			return "ip:" + c.IP()
		},
	})
}

// RateLimitByOrg creates a rate limiter keyed by organization ID
// Must be used after AuthRequired middleware
func RateLimitByOrg(max int, window time.Duration) fiber.Handler {
	return RateLimit(RateLimitConfig{
		Max:    max,
		Window: window,
		KeyFunc: func(c *fiber.Ctx) string {
			orgID, ok := c.Locals("orgID").(uint)
			if !ok {
				return "ip:" + c.IP() // Fallback to IP
			}
			return "org:" + itoa(int(orgID))
		},
	})
}

// RateLimitByAPIKey creates a rate limiter keyed by API key (via org)
// Must be used after APIKeyAuth middleware
func RateLimitByAPIKey(max int, window time.Duration) fiber.Handler {
	return RateLimit(RateLimitConfig{
		Max:    max,
		Window: window,
		KeyFunc: func(c *fiber.Ctx) string {
			orgID, ok := c.Locals("orgID").(uint)
			if !ok {
				return "ip:" + c.IP()
			}
			return "apikey:" + itoa(int(orgID))
		},
	})
}

// RateLimitAuth creates a stricter rate limiter for credential endpoints (login/signup)
func RateLimitAuth() fiber.Handler {
	return RateLimit(RateLimitConfig{
		Max:    10,               // 10 attempts
		Window: 15 * time.Minute, // per 15 minutes
		KeyFunc: func(c *fiber.Ctx) string {
			return "auth:" + c.IP()
		},
	})
}

// RateLimitValidation creates a rate limiter for signup form validation endpoints
// (check-name, check-slug, suggest-slug, check-email).
// More generous than auth to allow real-time form feedback, but still capped
// to limit enumeration (30 emails/min per IP = ~1800/hr max from single IP).
func RateLimitValidation() fiber.Handler {
	return RateLimit(RateLimitConfig{
		Max:    30,             // 30 checks
		Window: 2 * time.Minute, // per 2 minutes
		KeyFunc: func(c *fiber.Ctx) string {
			return "validate:" + c.IP()
		},
	})
}

// itoa converts int to string without importing strconv
func itoa(i int) string {
	if i == 0 {
		return "0"
	}
	if i < 0 {
		return "-" + itoa(-i)
	}
	var s string
	for i > 0 {
		s = string(rune('0'+i%10)) + s
		i /= 10
	}
	return s
}
