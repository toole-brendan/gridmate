# Gridmate - AI-Powered Financial Modeling Assistant

Gridmate is a desktop application that serves as "Cursor for financial modeling" - an AI-powered assistant that integrates directly with Excel and Google Sheets to help financial analysts build and analyze complex financial models.

## Features

- 🤖 **AI-Powered Assistance**: Claude Sonnet 3.5 powered chat interface for financial modeling help (or ChatGPT or Gemini)
- 📊 **Native Integration**: Seamless sidebar overlay for Excel and Google Sheets
- 🔍 **Context Awareness**: Understands your entire model and referenced documents
- ✅ **Human-in-the-Loop**: All changes previewed and require approval
- 📝 **Audit Trail**: Complete history of all AI actions and modifications
- 🏦 **Financial Templates**: Pre-built components for DCF, LBO, M&A models
- 🔐 **Security First**: All processing happens locally on your machine

## Target Users

- Hedge Fund Analysts
- Private Equity Associates
- Investment Banking Analysts
- Portfolio Managers
- Corporate Finance Teams


App "Orchestration" (notes from lecture by Karpathy): 

successful AI apps (uses Cursor and Perplexity as case studies) do this:
1. They are really good at context management - they are really good at immediately indexing large amounts of written data, which “extends” LLMs’ context windows by giving them most relevant data and/or in a way that is manageable for the LLM to handle (“chunking” the data)
2. They orchestrate and call multiple models (e.g. embedding models, chat models, diff apply models, etc…)
3. Application-specific GUI— says text is hard to read or interpret, stresses that keyboard shortcuts or clear visual indicators can help quicken the human-AI automation loop, says 
4. Autonomy slider — user is in charge of how autonomous the LLM can be with respect to making alterations to your work (which is very clear in Cursor but also uses term “autonomy slider” to describe how Perplexity lets users decide how long and how in-depth they want the LLM to search for a certain topic— from quick “search” to “deep research”)


