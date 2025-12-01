package config

import "os"

type Config struct {
	DatabaseURL string
	JWTSecret   string
	CORSOrigins string
	SendGridKey string
	Environment string
}

func Load() *Config {
	return &Config{
		DatabaseURL: getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/light_house?sslmode=disable"),
		JWTSecret:   getEnv("JWT_SECRET", "change-me-in-production"),
		CORSOrigins: getEnv("CORS_ORIGINS", "*"),
		SendGridKey: getEnv("SENDGRID_API_KEY", ""),
		Environment: getEnv("ENVIRONMENT", "development"),
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
