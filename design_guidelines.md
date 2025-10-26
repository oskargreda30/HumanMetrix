# Design Guidelines: HumanMetrix AI Assessment Platform

## Design Approach

**Reference-Based System Approach**: Drawing inspiration from enterprise SaaS leaders (Linear, Stripe, Notion) combined with assessment platform best practices. The design must convey professional credibility, technological sophistication, and data-driven precision while remaining approachable for both HR professionals and individual candidates.

## Core Design Principles

1. **Professional Authority**: Establish trust through clean layouts, precise typography, and data visualization excellence
2. **Cognitive Clarity**: Assessment interfaces must minimize cognitive load during testing
3. **Dual Audience Design**: Balance enterprise sophistication (employers) with candidate accessibility (test-takers)
4. **Progressive Disclosure**: Reveal complexity gradually - simple entry points, detailed results

## Typography System

### Font Stack
- **Primary (Headings)**: Inter (Google Fonts) - weights: 600, 700
- **Secondary (Body)**: Inter - weights: 400, 500
- **Monospace (Data/Scores)**: JetBrains Mono - weight: 500

### Hierarchy
- **Hero Headlines**: text-5xl md:text-6xl lg:text-7xl, font-bold, tracking-tight
- **Section Headers**: text-3xl md:text-4xl, font-semibold
- **Component Titles**: text-xl md:text-2xl, font-semibold
- **Body Text**: text-base md:text-lg, leading-relaxed
- **Assessment Questions**: text-lg md:text-xl, font-medium, leading-relaxed
- **Captions/Metadata**: text-sm, font-medium
- **Scores/Metrics**: text-4xl md:text-5xl, font-bold (monospace)

## Layout System

**Spacing Primitives**: Use Tailwind units of 4, 6, 8, 12, 16, 24, 32 (e.g., p-4, gap-8, space-y-12)

### Container Strategy
- **Full-width sections**: w-full with inner max-w-7xl mx-auto px-4 md:px-6 lg:px-8
- **Content sections**: max-w-6xl mx-auto
- **Assessment content**: max-w-4xl mx-auto (optimal reading/interaction width)
- **Narrow content (forms, text)**: max-w-2xl mx-auto

### Grid Systems
- **Landing Features**: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8
- **Assessment Cards**: grid grid-cols-1 md:grid-cols-2 gap-6
- **Results Dashboard**: grid grid-cols-1 lg:grid-cols-3 gap-6
- **Admin Tables**: Full-width responsive tables with horizontal scroll on mobile

## Component Library

### Navigation
- **Header**: Sticky top navigation with logo left, nav links center, CTA button right
- **Structure**: py-4 backdrop-blur with subtle border-b
- **Nav Links**: Horizontal spacing gap-8, hover underline effect
- **Mobile**: Hamburger menu with slide-in drawer

### Hero Section (Landing)
- **Layout**: Full viewport height (min-h-screen), two-column on desktop
- **Left Column**: Headlines, value proposition, dual CTAs (primary + secondary)
- **Right Column**: Abstract gradient visualization representing AI/data analysis
- **Background**: Subtle gradient mesh or geometric pattern, very low opacity

### Assessment Test Cards
- **Structure**: Rounded cards (rounded-xl) with border, p-6
- **Header**: Icon + Title + Question count badge
- **Body**: Brief description (2-3 lines)
- **Footer**: Duration estimate + Price tag
- **State Indicators**: "Completed" checkmark, "In Progress" progress bar, "Locked" icon

### Assessment Interface
- **Layout**: Single-column, max-w-4xl, minimal distractions
- **Progress**: Top-fixed progress bar (thin, 2px height)
- **Question Card**: Large card (p-8 md:p-12) with generous spacing
- **Options**: Radio buttons/checkboxes, full-width clickable areas (p-4), clear hover states
- **Navigation**: Fixed bottom bar with "Previous" and "Next" buttons

### Results Display
- **Hero Metrics**: Large score cards in grid, each with score (huge), label, and mini-description
- **Skill Breakdown**: Horizontal bar charts for each skill category
- **Radar Chart**: Overall profile visualization (6-point for FIT assessment)
- **PDF Export**: Prominent button, icon + "Download PDF Report"

### Admin Dashboard
- **Sidebar Navigation**: Fixed left sidebar (w-64), collapsible on mobile
- **Data Tables**: Striped rows, sortable headers, action buttons right-aligned
- **Stats Cards**: KPI cards at top (total users, completed assessments, revenue)
- **Invitation Form**: Clean form with email input, test selection checkboxes, send button

### Payment/Checkout
- **Test Selection**: Checkbox list with individual prices
- **Price Calculator**: Real-time total with breakdown (Base £15 + selected tests)
- **Stripe Elements**: Integrated card input with consistent styling
- **Summary Sidebar**: Sticky right column showing selected tests and total

### Forms
- **Input Fields**: Consistent height (h-12), rounded-lg, border with focus ring
- **Labels**: Above inputs, text-sm font-medium
- **Validation**: Inline error messages below fields, red accent
- **Buttons**: Primary (solid), Secondary (outline), heights match inputs

## Visual Elements

### Icons
- **Library**: Heroicons (outline for UI, solid for emphasis)
- **Sizes**: 
  - Navigation: w-5 h-5
  - Feature cards: w-8 h-8 md:w-10 h-10
  - Hero: w-12 h-12 md:w-16 h-16
- **Usage**: Paired with text, never standalone without labels

### Buttons
- **Primary**: px-6 py-3, rounded-lg, font-medium
- **Secondary**: Same size, border-2
- **Small**: px-4 py-2, text-sm
- **States**: Subtle scale transform on hover (scale-105), reduced opacity when disabled

### Cards
- **Standard**: rounded-xl, border, p-6, shadow-sm hover:shadow-md transition
- **Interactive**: Add hover:scale-[1.02] transform
- **Emphasis**: Add subtle gradient border or shadow

### Data Visualization
- **Progress Bars**: h-2 rounded-full, gradient fill
- **Score Rings**: Circular progress indicators for percentage scores
- **Bar Charts**: Horizontal bars for skill comparisons, labeled axes
- **Badges**: Small rounded pills for statuses (px-3 py-1, text-xs, font-medium, rounded-full)

## Page-Specific Layouts

### Landing Page Sections (in order)
1. **Hero**: Full viewport, split layout, gradient background, dual CTAs
2. **Trust Bar**: Logos/stats strip (py-12), "Trusted by X candidates"
3. **Assessments Overview**: 3-column grid of test cards with pricing
4. **How It Works**: 3-4 step process, icon + title + description
5. **For Employers**: Split section (image left, content right) explaining B2B value
6. **Results Preview**: Showcase sample result visualizations
7. **Pricing Summary**: Transparent breakdown table
8. **CTA Section**: Centered, gradient background, large heading + button
9. **Footer**: 4-column grid (Company, Assessments, Resources, Contact)

### Assessment Pages
- Minimal chrome, focus on question content
- Persistent progress indicator
- No distracting elements during active testing

### Results Page
- Summary hero with overall score
- Detailed skill breakdown below
- PDF download prominently placed
- Option to share results (link generation)

## Images

### Hero Section
**Primary Hero Image**: Abstract, high-quality visual representing AI/data analysis
- **Style**: Modern, gradient-based geometric patterns OR stylized brain/network visualization
- **Treatment**: Soft glow effects, blend mode overlay
- **Placement**: Right 50% of hero section on desktop, background on mobile
- **Dimensions**: 1200x800px minimum

### For Employers Section  
**Business Context Image**: Professional setting showing assessment usage
- **Style**: Clean, modern office environment or dashboard mockup
- **Placement**: Left 40% of section, image-text split
- **Dimensions**: 800x600px

### Results Preview Section
**Sample Dashboard Screenshot**: High-fidelity result visualization
- **Style**: Actual UI mockup showing charts, scores, insights
- **Placement**: Centered within section
- **Dimensions**: 1400x900px

## Accessibility
- WCAG AA compliance throughout
- Focus indicators on all interactive elements (ring-2 ring-offset-2)
- Sufficient touch targets (min 44x44px)
- Clear form labels and error states
- Keyboard navigation for all workflows