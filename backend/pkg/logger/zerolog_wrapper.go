package logger

import (
	"github.com/rs/zerolog"
	"github.com/sirupsen/logrus"
)

// ZeroLogWrapper wraps logrus logger to provide zerolog-like interface
type ZeroLogWrapper struct {
	logger *logrus.Logger
}

// NewZeroLogWrapper creates a new wrapper
func NewZeroLogWrapper(logger *logrus.Logger) *ZeroLogWrapper {
	return &ZeroLogWrapper{logger: logger}
}

// Event represents a log event
type Event struct {
	entry  *logrus.Entry
	logger *logrus.Logger
}

// Info returns an info level event
func (w *ZeroLogWrapper) Info() *Event {
	return &Event{
		entry:  w.logger.WithFields(logrus.Fields{}),
		logger: w.logger,
	}
}

// Debug returns a debug level event
func (w *ZeroLogWrapper) Debug() *Event {
	return &Event{
		entry:  w.logger.WithFields(logrus.Fields{}),
		logger: w.logger,
	}
}

// Error returns an error level event
func (w *ZeroLogWrapper) Error() *Event {
	return &Event{
		entry:  w.logger.WithFields(logrus.Fields{}),
		logger: w.logger,
	}
}

// Warn returns a warn level event
func (w *ZeroLogWrapper) Warn() *Event {
	return &Event{
		entry:  w.logger.WithFields(logrus.Fields{}),
		logger: w.logger,
	}
}

// With returns a context with the specified field
func (w *ZeroLogWrapper) With() zerolog.Context {
	// This is a simplified implementation
	// In production, you might want to create a proper context wrapper
	return zerolog.New(nil).With()
}

// Str adds a string field
func (e *Event) Str(key, val string) *Event {
	e.entry = e.entry.WithField(key, val)
	return e
}

// Int adds an int field
func (e *Event) Int(key string, val int) *Event {
	e.entry = e.entry.WithField(key, val)
	return e
}

// Bool adds a bool field
func (e *Event) Bool(key string, val bool) *Event {
	e.entry = e.entry.WithField(key, val)
	return e
}

// Err adds an error field
func (e *Event) Err(err error) *Event {
	if err != nil {
		e.entry = e.entry.WithError(err)
	}
	return e
}

// Interface adds an interface field
func (e *Event) Interface(key string, val interface{}) *Event {
	e.entry = e.entry.WithField(key, val)
	return e
}

// Msg sends the event with a message
func (e *Event) Msg(msg string) {
	// Determine log level based on the entry
	level := e.entry.Level
	switch level {
	case logrus.DebugLevel:
		e.entry.Debug(msg)
	case logrus.InfoLevel:
		e.entry.Info(msg)
	case logrus.WarnLevel:
		e.entry.Warn(msg)
	case logrus.ErrorLevel:
		e.entry.Error(msg)
	default:
		e.entry.Info(msg)
	}
}

// Msgf sends the event with a formatted message
func (e *Event) Msgf(format string, v ...interface{}) {
	e.entry.Infof(format, v...)
}

// Send sends the event (for compatibility)
func (e *Event) Send() {
	e.Msg("")
}
