# Wendigo - AI-Powered Financial Modeling Assistant

## Project Overview

Wendigo is a desktop application that serves as "Cursor for financial modeling" - an AI-powered assistant that integrates directly with Excel and Google Sheets to help financial analysts, portfolio managers, and investment professionals build, analyze, and audit complex financial models with unprecedented speed and accuracy.

## Core Mission

Transform financial modeling workflows by providing an intelligent AI assistant that:
- **Augments** human analysts rather than replacing them
- **Maintains** complete user control and auditability
- **Accelerates** model building and analysis by 50%+
- **Ensures** accuracy through automated validation
- **Preserves** data security with local-first architecture

## Key Features

### 1. Intelligent Spreadsheet Integration
- Seamless sidebar overlay for Excel and Google Sheets
- Real-time monitoring of selected cells and ranges
- Context-aware AI suggestions based on current work
- Formula generation and error correction
- Automatic model type recognition (DCF, LBO, M&A, etc.)

### 2. Advanced Context Management
- Ingests and indexes financial documents (10-Ks, PDFs, presentations)
- Maintains semantic understanding of entire models
- Cross-references external data with internal calculations
- Provides source citations for all external information

### 3. Human-in-the-Loop Design
- Three autonomy levels: Manual, Assisted, Auto
- Preview all changes before applying
- Complete audit trail of AI actions
- Rollback capability for any modification
- Visual diff view for proposed changes

### 4. Multi-Agent Financial Intelligence
- Specialized agents for different tasks:
  - Data Retrieval Agent for market data and filings
  - Calculation Agent for complex financial math
  - Validation Agent for error checking
  - Report Generation Agent for insights and memos
- Orchestrated workflow for complex requests

### 5. Financial Model Templates
- Pre-built components for common models:
  - Discounted Cash Flow (DCF)
  - Leveraged Buyout (LBO)
  - Merger Models (M&A)
  - Trading Comparables
  - Credit Analysis
- Intelligent adaptation to existing model structure

## Technical Architecture

### Frontend
- **Framework**: React + TypeScript
- **UI Library**: Tailwind CSS for responsive design
- **State Management**: Zustand for app state, Redux for model state
- **Desktop**: Electron for cross-platform support

### Backend
- **Server**: Node.js + Express (local)
- **AI/LLM**: Anthropic Claude Sonnet 3.5 with local fallback (Ollama)
- **Vector DB**: ChromaDB for context management
- **Database**: SQLite for audit trails and settings

### Integration Layer
- **Excel**: Office.js API for add-in functionality
- **Google Sheets**: REST API v4 for web integration
- **Data Sources**: APIs for market data, SEC filings

## Development Guidelines

### Code Organization
```
/src
  /components     # React UI components
  /services       # Business logic and integrations
  /agents         # AI agent implementations
  /models         # Data models and types
  /utils          # Helper functions
  /store          # State management
```

### Key Patterns
1. **Adapter Pattern** for spreadsheet integrations
2. **Observer Pattern** for real-time updates
3. **Command Pattern** for undoable actions
4. **Strategy Pattern** for different AI agents

### Coding Standards
- TypeScript strict mode enabled
- Comprehensive error handling
- All AI actions must be auditable
- Security-first approach for data handling
- Performance optimization for large models

## Important Context for AI Assistance

### Domain Knowledge
This application targets professional financial analysts who:
- Build complex Excel models daily
- Need extreme accuracy (errors can cost millions)
- Work under time pressure
- Require full audit trails for compliance
- Handle sensitive financial data

### User Workflow
1. Analyst opens their Excel/Sheets model
2. Wendigo sidebar appears with context-aware chat
3. Analyst can ask questions, request changes, or generate analyses
4. AI suggests improvements or automates repetitive tasks
5. All changes are previewed and require approval
6. Full audit trail maintained for compliance

### Critical Requirements
- **Accuracy**: Financial calculations must be 100% correct
- **Security**: All data processing happens locally
- **Speed**: Responses within 3 seconds
- **Reliability**: No data loss or corruption
- **Transparency**: Every AI action must be explainable

### Common Financial Models We Support

1. **DCF (Discounted Cash Flow)**
   - Revenue projections
   - Cost modeling
   - WACC calculations
   - Terminal value
   - Sensitivity analysis

2. **LBO (Leveraged Buyout)**
   - Debt schedules
   - Cash sweep logic
   - Returns analysis (IRR, MoM)
   - Exit scenarios
   - Management rollover

3. **M&A Models**
   - Accretion/dilution analysis
   - Synergy modeling
   - Pro forma statements
   - Purchase price allocation
   - Integration costs

4. **Trading Comps**
   - Peer selection
   - Multiple calculations
   - Outlier detection
   - Regression analysis
   - Valuation ranges

## AI Agent Behaviors

When assisting with this project, AI should:

1. **Prioritize accuracy** over speed in financial calculations
2. **Always maintain audit trails** for any generated code
3. **Use financial terminology** correctly and precisely
4. **Validate formulas** against known financial principles
5. **Suggest error checking** for critical calculations
6. **Implement proper error handling** for all edge cases
7. **Consider performance** for large datasets (10k+ rows)
8. **Ensure data privacy** - no external API calls without permission

## Current Development Status

- Project Phase: Initial Development
- Target Launch: 4 months
- Primary Focus: MVP with Excel integration
- Next Milestone: Basic chat interface with formula assistance

## Key Success Metrics

- 50% reduction in model building time
- 99.9% accuracy on financial calculations
- < 3 second response time
- Support for 50MB+ Excel files
- Zero data breaches or losses

---

This project aims to revolutionize financial modeling by bringing the power of AI to every analyst's desktop, making them more productive while maintaining the control and accuracy the industry demands.