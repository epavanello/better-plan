# Content Suggestion Feature Implementation Guide

## Stato Attuale e Prossimi Passi
L'implementazione di base per la generazione dei suggerimenti è completa. Gli utenti possono selezionare una piattaforma, generare suggerimenti e accettarli/rifiutarli.

Le seguenti funzionalità principali sono **mancanti** e rappresentano i prossimi passi:
- **Pubblicazione e Pianificazione**: Integrare la logica per creare un post (immediatamente o pianificato) quando un suggerimento viene "accettato".
- **Ottimizzazione (Tuning) dei Suggerimenti**: Implementare il pannello di controllo per modificare i parametri di un suggerimento generato (tono, stile, lunghezza, etc.) e rigenerarlo.
- **Modifica Manuale**: Permettere la modifica manuale del testo di un suggerimento prima di accettarlo.

---

## Overview
Implement a new "Content Suggestions" page that allows users to generate AI-powered content proposals, tune them with various parameters, and schedule/publish them directly to their connected social media platforms.

## Feature Requirements

### Core Functionality
- **[x] Page Structure**: Similar to `/app/write` and `/app/calendar` pages
- **[x] Platform Selection**: Integration selector dropdown (reuse `PlatformSelector` component)
- **[x] AI Content Generation**: Generate 1-N content proposals from scratch
- **[ ] Content Tuning**: Adjust tone, length, style, and other parameters for each proposal **(TODO)**
- **[x] Proposal Management**: View, edit, delete individual proposals
- **[ ] Scheduling/Publishing**: Accept proposals and schedule or publish immediately **(TODO)**

### User Flow
1. **[x]** Select platform integration
2. **[x]** Click "Suggest Content" to generate 1-N proposals
3. **[ ]** Tune each proposal with AI parameters **(TODO)**
4. **[x]** Review and accept proposals
5. **[ ]** Schedule or publish accepted content **(TODO)**

## Technical Implementation

### 1. Database Schema Extensions

#### New Table: `content_suggestions`
```sql
-- This has been implemented via Drizzle migration
CREATE TABLE `content_suggestions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `integration_id` text NOT NULL,
  `content` text NOT NULL,
  `status` text DEFAULT 'draft' NOT NULL, -- 'draft', 'accepted', 'rejected'
  `ai_prompt` text,
  `ai_model` text,
  `ai_parameters` text, -- JSON string for tuning parameters
  `generation_history` text, -- JSON array of previous versions
  `scheduled_at` integer,
  `posted_at` integer,
  `post_id` text, -- Reference to created post if accepted
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`integration_id`) REFERENCES `integrations`(`id`) ON DELETE CASCADE
);
```

### 2. File Structure

#### New Route
- **[x]** `src/routes/_protected/app/suggestions.tsx` - Main suggestions page

#### New Components
- **[x]** `src/components/content-suggestions/` - Directory for suggestion-related components
  - **[x]** `suggestions-generator.tsx` - AI content generation interface
  - **[x]** `suggestion-card.tsx` - Individual suggestion display and tuning
  - **[x]** `suggestions-list.tsx` - List of all suggestions with actions
  - **[ ]** `suggestion-tuning-panel.tsx` - Reusable tuning controls (extract from AI generator) **(TODO)**

#### New Functions
- **[x]** `src/functions/suggestions.ts` - Server functions for suggestions
- **[x]** `src/lib/server/suggestion-service.ts` - Business logic for suggestions

### 3. Component Architecture

#### Main Page Structure (`suggestions.tsx`)
```typescript
// This has been implemented
export const Route = createFileRoute("/_protected/app/suggestions")({
  loader: async () => {
    const integrations = await getIntegrations()
    return { integrations }
  },
  validateSearch: z.object({
    integrationId: z.string().optional()
  }),
  component: RouteComponent
})
```

#### Page Layout
- **Header**: Title + Platform Selector (reuse existing pattern)
- **Main Content**: Two-column layout on desktop
  - **Left Column (2/3)**: Suggestions Generator + Suggestions List
  - **Right Column (1/3)**: Selected Suggestion Tuning Panel

### 4. AI Integration

#### Extend Existing AI Service
- **[x]** Reuse `AiService` class from `src/lib/server/ai-service.ts`
- **[x]** Add new method: `generateContentSuggestions(options: SuggestionGenerationOptions)`
- **[x]** Leverage existing context service for user history and preferences

#### New AI Function
```typescript
// This has been implemented in src/functions/suggestions.ts
export const generateContentSuggestions = createServerFn({
  method: "POST"
})
.validator(z.object({
  integrationId: z.string(),
  count: z.number().min(1).max(10), // Number of suggestions to generate
  basePrompt: z.string().optional(),
  // Reuse existing AI tuning parameters
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  styleOverride: z.enum(["casual", "formal", "humorous", "professional", "conversational"]).optional(),
  // ... other tuning parameters
}))
```

### 5. Reusable Components

#### Extract Tuning Controls **(TODO)**
- **[ ]** Create `src/components/content-suggestions/suggestion-tuning-panel.tsx`
- **[ ]** Extract tuning logic from `AiGenerator` component
- **[ ]** Make it reusable for both write page and suggestions page

#### Suggestion Card Component
```typescript
// Implemented with a subset of these props. onTune, onSchedule, and onPublish are missing.
interface SuggestionCardProps {
  suggestion: ContentSuggestion
  onTune: (suggestionId: string, parameters: AiTuningParameters) => void // TODO
  onAccept: (suggestionId: string) => void
  onReject: (suggestionId: string) => void
  onSchedule: (suggestionId: string, scheduledAt: Date) => void // TODO
  onPublish: (suggestionId: string) => void // TODO
}
```

### 6. State Management

#### Local State (useState)
- **[x]** Selected integration ID
- **[x]** Generated suggestions array
- **[ ]** Currently selected suggestion for tuning **(TODO)**
- **[x]** Generation parameters

#### Server State (useQuery/useMutation)
- **[x]** Fetch existing suggestions for selected integration
- **[x]** Generate new suggestions
- **[ ]** Update suggestion (tuning) **(TODO)**
- **[x]** Accept/reject suggestions
- **[ ]** Schedule/publish suggestions **(TODO)**

### 7. Navigation Integration

#### Add to Header Navigation
- **[x]** Update `src/components/header.tsx`
- **[x]** Add "Suggestions" link in the navigation menu

#### Route Configuration
- Add route to `src/router.tsx` (if using file-based routing, this is automatic)

### 8. Code Conventions to Follow

#### File Organization
- Follow existing pattern: `src/routes/_protected/app/` for pages
- Components in `src/components/` with descriptive subdirectories
- Server functions in `src/functions/`
- Business logic in `src/lib/server/`

#### Component Patterns
- Use existing UI components from `src/components/ui/`
- Follow the same prop patterns as existing components
- Use TypeScript interfaces for all props
- Implement proper error handling with toast notifications

#### Styling
- Use Tailwind CSS classes
- Follow existing responsive design patterns
- Use shadcn/ui components for consistency
- Maintain dark/light theme compatibility

#### State Management
- Use TanStack Query for server state
- Use React useState for local state
- Follow existing mutation patterns with proper loading states

#### Error Handling
- Use toast notifications for user feedback
- Implement proper validation with Zod schemas
- Handle API errors gracefully

### 9. Integration Points

#### Existing Systems to Leverage
- **[x]** **Platform Integration**: Reuse `PlatformSelector` and platform info
- **[x]** **AI Service**: Extend existing `AiService` for suggestion generation
- **[ ]** **Post Creation**: Reuse `createPost` function when accepting suggestions **(TODO)**
- **[x]** **Context Service**: Use existing user context and post history
- **[x]** **Authentication**: Use existing session management

#### Database Relationships
- **[x]** Link suggestions to integrations and users
- **[x]** Track suggestion lifecycle (draft → accepted → posted)
- **[x]** Store AI generation parameters for reproducibility

### 10. Implementation Phases

- **[x] Phase 1: Core Structure**
- **[x] Phase 2: AI Generation**
- **[ ] Phase 3: Tuning and Management** (Management is done, Tuning is **TODO**)
- **[ ] Phase 4: Publishing Integration** (**TODO**)
- **[ ] Phase 5: Polish** (Basic loading/errors are done, but can be improved)

## Success Criteria

1. **[In Progress]** **Functional**: Users can generate, tune, and publish content suggestions
2. **[OK]** **Performance**: AI generation completes within reasonable time (< 30 seconds)
3. **[OK]** **Usability**: Interface is intuitive and follows existing patterns
4. **[In Progress]** **Reliability**: Proper error handling and validation
5. **[OK]** **Maintainability**: Code follows existing conventions and is well-documented 