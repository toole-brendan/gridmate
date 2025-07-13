package database

import (
	"fmt"
	"log"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/lib/pq"
)

func RunMigrations(db *DB, migrationsPath string) error {
	log.Printf("Starting migrations from path: %s", migrationsPath)
	
	driver, err := postgres.WithInstance(db.DB.DB, &postgres.Config{})
	if err != nil {
		return fmt.Errorf("failed to create migration driver: %w", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		fmt.Sprintf("file://%s", migrationsPath),
		"postgres",
		driver,
	)
	if err != nil {
		return fmt.Errorf("failed to create migrate instance: %w", err)
	}

	// Check current version before migration
	currentVersion, dirty, _ := m.Version()
	log.Printf("Current migration version: %d, dirty: %v", currentVersion, dirty)

	// Run migrations
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		// Get more details about the error
		if currentVersion, dirty, vErr := m.Version(); vErr == nil {
			log.Printf("Migration failed at version: %d, dirty: %v", currentVersion, dirty)
		}
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	version, dirty, err := m.Version()
	if err != nil && err != migrate.ErrNilVersion {
		return fmt.Errorf("failed to get migration version: %w", err)
	}

	if dirty {
		log.Printf("WARNING: Database is in dirty state at version %d", version)
	} else {
		log.Printf("Database migrated to version %d", version)
	}

	return nil
}

func RollbackMigration(db *DB, migrationsPath string, steps int) error {
	driver, err := postgres.WithInstance(db.DB.DB, &postgres.Config{})
	if err != nil {
		return fmt.Errorf("failed to create migration driver: %w", err)
	}

	m, err := migrate.NewWithDatabaseInstance(
		fmt.Sprintf("file://%s", migrationsPath),
		"postgres",
		driver,
	)
	if err != nil {
		return fmt.Errorf("failed to create migrate instance: %w", err)
	}

	if err := m.Steps(-steps); err != nil {
		return fmt.Errorf("failed to rollback migrations: %w", err)
	}

	version, _, err := m.Version()
	if err != nil && err != migrate.ErrNilVersion {
		return fmt.Errorf("failed to get migration version: %w", err)
	}

	log.Printf("Database rolled back to version %d", version)
	return nil
}