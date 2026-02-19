# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React + TypeScript + Vite application that provides a flick-based Japanese input system, specifically designed for ALS patients to input Japanese text through touch gestures. The app supports two modes: free input (hiragana) and template-based input for common phrases.

## Development Commands

- `npm run dev` - Start development server with Vite HMR
- `npm run build` - Build the application (runs TypeScript compiler first, then Vite build)
- `npm run lint` - Run ESLint for code quality checks
- `npm run preview` - Preview the built application locally

## Architecture

### Core Components
- `src/App.tsx` - Simple root component that renders FlickInput
- `src/components/FlickInput.tsx` - Main input component implementing the flick gesture system
- `src/components/FlickInput.css` - Comprehensive styling including responsive design for tablets/iPads

### Key Technical Details

**FlickInput Component Features:**
- 3x3 grid-based touch interface for Japanese character input
- Supports both touch and mouse events (for development)
- Two input modes: free input (hiragana rows) and template categories
- Complex gesture recognition: tap, double-tap, and 8-directional flick gestures
- Real-time visual feedback with direction indicators during flick gestures
- Responsive design with different grid sizes for mobile/tablet/desktop

**Input System Logic:**
- Base 9 hiragana characters mapped to 3x3 grid positions
- Each character expands to its full hiragana row (あ→あいうえお)
- Template system with predefined categories (thanks, requests, pain, etc.)
- History system for navigation between character rows
- Dynamic font sizing based on input text length

**Gesture Mapping:**
- Center tap/click: Select current character/category
- Double tap: Delete last character
- 8-directional flicks: Navigate/select different options
- Special gestures: back (top-left), delete (top-right), template mode (bottom-left), clear all (bottom-right)

## Deployment

The application is configured for Vercel deployment with build settings in `vercel.json`.