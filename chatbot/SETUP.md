# Gemini API Setup Guide

## Environment Variable Setup

Create a `.env` file in the root directory of your project and add:

```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

## Getting Your API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key
5. Replace `your_gemini_api_key_here` in your `.env` file with the actual key

## Model Used

This chatbot uses **Gemini 2.5 Flash** model for fast and efficient responses.

## Important Notes

- The environment variable name is `VITE_GEMINI_API_KEY`
- Never commit your `.env` file to version control
- The `VITE_` prefix is required for Vite to expose the variable to the client
- Restart your development server after creating/updating the `.env` file
