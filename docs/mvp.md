## MVP Functional Context

**Goal:**  
Enable a single user to create, refine and publish social media content with minimal setup, leveraging AI suggestions and direct scheduling.

---

### Core Features

1. **Authentication & Onboarding**  
   - Email/password login  
   - OAuth connection to one social platform (e.g. Twitter)

2. **Platform Management**  
   - List connected accounts  
   - Add / remove / refresh OAuth tokens

3. **Content Creation**  
   - Free-form text editor (single post or thread)  
   - “Suggest” button → AI-generated draft  
   - “Improve” button → shuffle + insert enhancements

4. **Scheduling & Publishing**  
   - Calendar view for date/time selection  
   - “Publish Now” or “Schedule”  
   - Optional “Enable smart replies” toggle

5. **History & Context**  
   - Timeline of past posts (text + timestamp)  
   - Use history to inform AI tone/style

---

### Non-Functional Constraints

- **Simplicity:** lean UI, minimal steps  
- **Reliability:** basic error logging, single retry  
- **Scalability:** modular connectors, token-safe storage  
