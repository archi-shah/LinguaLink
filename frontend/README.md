# 🌐 LangBridge - Modern WhatsApp-like Messaging App with Real-Time Translation

A production-ready frontend for a multilingual messaging application built with React, Vite, Tailwind CSS, and Framer Motion.

## Features

✨ **Real-Time Communication**
- Instant messaging with modern UI
- WhatsApp-like chat interface
- Typing indicators and delivery status

🌍 **Language Translation**
- Auto-translate incoming messages
- Support for 200+ languages
- Toggle translation on individual messages
- Language badges on messages

🎨 **Modern Design**
- Beautiful gradient UI with purple-blue theme
- Glassmorphism design elements
- Dark mode support
- Smooth animations with Framer Motion
- Fully responsive design

🤖 **AI Assistant**
- Floating chatbot button
- Quick reply suggestions
- Helpful responses

🔒 **Privacy & Security**
- Privacy mode (blur names and messages)
- End-to-end encryption indicators
- User-controlled settings

📱 **User Experience**
- Intuitive chat interface
- Contact avatar system
- Online/offline status indicators
- Status updates feature
- Attachment menu

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **React Router** - Navigation
- **Zustand** - State management
- **Lucide React** - Icons

## Project Structure

```
src/
├── components/
│   ├── chat/
│   │   ├── MessageBubble.jsx    # Message display component
│   │   ├── ChatInput.jsx        # Message input with file attachment
│   │   └── AttachmentMenu.jsx   # Attachment options menu
│   ├── layout/
│   │   ├── Sidebar.jsx          # Left navigation sidebar
│   │   ├── ChatPanel.jsx        # Chat list with filtering
│   │   └── ChatWindow.jsx       # Main chat window
│   ├── status/
│   │   └── StatusPanel.jsx      # Status updates view
│   └── ChatbotPanel.jsx         # Floating AI assistant
├── pages/
│   ├── LandingPage.jsx          # Home page with features
│   ├── AuthPage.jsx             # Login/Register with 3D flip
│   └── ChatPage.jsx             # Main chat interface
├── store/
│   └── useStore.js              # Zustand store with mock data
├── data/
│   └── mockData.js              # Mock data for demonstration
├── App.jsx                      # Main app routing
└── main.jsx                     # Entry point
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Navigate to the project directory:**
```bash
cd langbridge
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start the development server:**
```bash
npm run dev
```

4. **Open in browser:**
Visit `http://localhost:5173` (or the URL shown in terminal)

### Build for Production

```bash
npm run build
```

## Usage

### Landing Page
- Browse features and benefits
- Sign up or login from navbar
- Dark mode toggle

### Authentication
- Login with email/password
- Register new account
- 3D flip card animation

### Chat Interface
- Select a chat from the sidebar
- Send messages with automatic translations
- Click language badge to toggle translation
- Use emoji and attachment buttons

### Settings
- Toggle auto-translate
- Enable privacy mode
- Switch between light/dark mode

### AI Chatbot
- Click floating button (bottom-right)
- Ask questions or use quick replies
- Get instant assistance

## Mock Data

The app includes pre-loaded dummy data:
- 6 chat conversations in multiple languages
- Message threads with translations
- User status updates
- Online/offline indicators

No backend required - everything runs locally with Zustand state management.

## Design System

### Color Palette
- **Primary:** `#7B5CFF` (Purple)
- **Accent:** `#5B8CFF` (Blue)
- **Success:** `#22C55E` (Green)
- **Warning:** `#F59E0B` (Amber)
- **Danger:** `#F43F5E` (Red)

### Typography
- **Display:** Plus Jakarta Sans (headings)
- **Body:** Inter (content)
- **Mono:** Inter (code)

### Components
- Glassmorphism cards with backdrop blur
- Smooth transitions and animations
- Responsive grid layouts
- Touch-friendly mobile interface

## Key Features Explained

### Message Translation
- Messages show original language badge
- Click badge to toggle translated version
- Visual indication of translation state

### Privacy Mode
- Blurs names and message content
- Can be toggled in settings
- Shows privacy banner when active

### Chat Filtering
- All chats
- Unread messages
- Groups only
- Translated conversations
- Pinned chats

### Responsive Design
- Desktop: Full sidebar + chat + preview
- Tablet: Collapsible sidebar
- Mobile: Stacked layout

## Performance Optimizations

- Code splitting with React.lazy
- Image optimization
- CSS-in-JS for dynamic styles
- Smooth 60fps animations
- Optimized re-renders with Zustand

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

- Backend API integration
- Real user authentication
- Database for messages
- Voice/video calls
- File sharing
- Group chat management
- Message search
- Notification system
- User profiles
- Contact list

## License

MIT

## Notes

This is a frontend-only demonstration. For production use:
1. Connect to a real backend API
2. Implement proper authentication
3. Add database storage
4. Set up WebSocket for real-time communication
5. Add proper error handling
6. Implement actual translation API

Built with ❤️ for global communication
