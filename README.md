# Better Plan

A modern, AI-powered social media management tool that helps you create, schedule, and publish engaging content across multiple platforms.

## 🚀 Features

### Core Functionality
- **🔐 Authentication & Authorization** - Secure email/password and OAuth authentication
- **📱 Multi-Platform Support** - Connect and manage multiple social media accounts (Twitter/X, with more platforms coming)
- **🤖 AI-Powered Content Creation** - Generate and improve posts with OpenAI integration
- **📅 Smart Scheduling** - Plan and schedule posts using an intuitive calendar interface
- **📊 Content History & Analytics** - Track your publishing history and maintain context for AI suggestions
- **🎨 Modern UI** - Clean, responsive interface built with Tailwind CSS and shadcn/ui components

### AI Features
- **Context-Aware Generation** - AI learns from your writing style and post history
- **Content Improvement** - Enhance existing posts with AI suggestions
- **Flexible Deployment** - Self-hosted (free) or SaaS (subscription-based) AI usage
- **Smart Suggestions** - Get AI-powered content ideas based on your niche and audience

### Developer Experience
- **Type-Safe** - Built with TypeScript for better development experience
- **Modern Stack** - React 19, TanStack Start, Drizzle ORM, and Vite
- **Containerized** - Docker support for easy deployment
- **Database Migration** - Automatic schema management with Drizzle Kit

## 🛠️ Tech Stack

- **Frontend**: React 19, TanStack Start, TanStack Query, Tailwind CSS
- **Backend**: TanStack Start (full-stack), Better Auth
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI GPT integration
- **Build Tools**: Vite, TypeScript, Biome (linting)
- **Deployment**: Docker, GitHub Actions CI/CD

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ and pnpm
- PostgreSQL database
- OpenAI API key (optional, for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/better-plan.git
   cd better-plan
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Database
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_DB=better-plan
   
   # App Configuration
   APP_URL=http://localhost:3000
   BETTER_AUTH_SECRET=your-secret-key-here
   
   # AI Features (Optional)
   OPENAI_API_KEY=sk-your-openai-key-here
   DEPLOYMENT_TYPE=self-hosted
   AI_MODEL=gpt-4o-mini
   
   # Social Media APIs (Optional)
   X_CLIENT_ID=your-twitter-client-id
   X_CLIENT_SECRET=your-twitter-client-secret
   ```

4. **Start the development database**
   ```bash
   pnpm run dev:docker
   ```

5. **Run database migrations**
   ```bash
   pnpm run db:migrate
   ```

6. **Start the development server**
   ```bash
   pnpm dev
   ```

Visit `http://localhost:3000` to access the application.

## 🎯 Usage

### Setting Up Social Media Accounts

1. **Sign up/Login** - Create an account or sign in with your credentials
2. **Connect Platforms** - Go to the Platforms page and connect your social media accounts
3. **Authorize Access** - Complete the OAuth flow for each platform you want to use

### Creating and Publishing Content

1. **Create Post** - Use the post editor to write your content
2. **AI Assistance** - Click "Suggest" for AI-generated drafts or "Improve" to enhance existing content
3. **Schedule or Publish** - Choose to publish immediately or schedule for later
4. **Track History** - View your published posts and their performance

### AI Features Setup

For self-hosted installations:
- Set `DEPLOYMENT_TYPE=self-hosted` in your `.env` file
- Configure your `OPENAI_API_KEY`
- Enjoy unlimited AI features

For SaaS deployments:
- Set `DEPLOYMENT_TYPE=saas` 
- Configure subscription limits
- See [AI Features Setup Guide](./setup-ai.md) for detailed instructions

## 📚 Documentation

- [AI Features Setup Guide](./setup-ai.md) - Comprehensive guide for configuring AI features
- [Release Management](./docs/RELEASE.md) - How to create releases and deploy
- [AI Features Roadmap](./docs/ai-features-roadmap.md) - Planned AI enhancements
- [MVP Scope](./docs/mvp.md) - Current MVP features and goals

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Setup

1. **Fork the repository** and clone your fork
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** following our coding standards
4. **Test your changes**
   ```bash
   pnpm lint
   pnpm check-types
   pnpm build
   ```
5. **Commit with conventional commits**
   ```bash
   git commit -m "feat: add new scheduling feature"
   ```
6. **Push and create a pull request**

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/) for automated versioning:

- `feat:` - New features (minor version bump)
- `fix:` - Bug fixes (patch version bump)
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `feat!:` or `BREAKING CHANGE:` - Breaking changes (major version bump)

### Code Standards

- **TypeScript** - All code must be properly typed
- **Biome** - We use Biome for linting and formatting
- **Components** - Use shadcn/ui components when possible
- **Database** - Use Drizzle ORM for all database operations
- **Authentication** - Use Better Auth for all auth-related features

### Available Scripts

```bash
# Development
pnpm dev                    # Start development server
pnpm dev:docker            # Start development with Docker
pnpm db:studio             # Open Drizzle Studio

# Building & Testing
pnpm build                 # Build for production
pnpm lint                  # Run linting
pnpm lint:fix             # Fix linting issues
pnpm check-types          # Type checking

# Database
pnpm db:generate          # Generate migrations
pnpm db:migrate           # Run migrations
pnpm db:studio            # Database management UI

# Docker
pnpm docker:build         # Build production image
pnpm docker:up            # Start production containers
pnpm docker:down          # Stop containers

# Release
pnpm release:patch        # Patch version release
pnpm release:minor        # Minor version release
pnpm release:major        # Major version release
```

## 🚀 Deployment

### Docker Deployment

1. **Build the image**
   ```bash
   pnpm docker:build
   ```

2. **Start the services**
   ```bash
   pnpm docker:up
   ```

### Manual Deployment

1. **Build the application**
   ```bash
   pnpm build
   ```

2. **Start the production server**
   ```bash
   pnpm start
   ```

### Automated Deployment

We use GitHub Actions for CI/CD:
- **Docker images** are automatically built and pushed to GitHub Container Registry
- **Releases** are created automatically based on conventional commits
- **Multi-platform support** (amd64, arm64) for Docker images

## 📈 Roadmap

### Current MVP Features
- ✅ User authentication and authorization
- ✅ Twitter/X integration
- ✅ Basic content creation and scheduling
- ✅ AI-powered content generation
- ✅ Post history and timeline

### Upcoming Features
- 🔄 Additional social media platforms (LinkedIn, Instagram, Facebook)
- 🔄 Advanced AI features (competitor analysis, bulk content planning)
- 🔄 Team collaboration and approval workflows
- 🔄 Advanced analytics and performance tracking
- 🔄 Content templates and reusable formats

See our [AI Features Roadmap](./docs/ai-features-roadmap.md) for detailed planned enhancements.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues** - Report bugs or request features via [GitHub Issues](https://github.com/your-username/better-plan/issues)
- **Discussions** - Join community discussions for questions and ideas
- **Documentation** - Check the `docs/` directory for detailed guides

## 🙏 Acknowledgments

- Built with [TanStack Start](https://tanstack.com/start) for the full-stack framework
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Authentication via [Better Auth](https://www.better-auth.com/)
- Database management with [Drizzle ORM](https://orm.drizzle.team/)
- AI integration powered by [OpenAI](https://openai.com/)

---

**Better Plan** - Making social media management better, one post at a time. 🚀
