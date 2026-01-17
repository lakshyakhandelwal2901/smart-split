# Smart Split - Expense Splitting App

A comprehensive expense splitting and personal finance management application inspired by Splitwise. Built with React, Node.js, and Express.

![Smart Split](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🌟 Features

### Core Functionality
- **User Authentication** - Secure registration and login with JWT tokens
- **Expense Tracking** - Add, view, edit, and delete transactions
- **Split Transactions** - Split expenses equally or with custom amounts
- **Group Management** - Create groups for shared expenses (roommates, trips, etc.)
- **Balance Calculation** - Automatic calculation of who owes whom
- **Settlement Tracking** - Record payments and settle balances
- **Multiple Payment Types** - Support for cash, bank transfers, and general expenses

### User Experience
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **Real-time Search** - Search users to add to transactions and groups
- **Dashboard Overview** - Quick view of your financial status
- **Category Organization** - Organize expenses by categories (food, transport, etc.)
- **User Profiles** - Manage your personal information

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone or navigate to the project directory**
   ```bash
   gh repo clone lakshyakhandelwal2901/smart-split
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Set up environment variables**
   ```bash
   copy .env.example .env
   ```
   
   Edit `.env` and set your configuration:
   ```env
   PORT=5000
   JWT_SECRET=your_secure_jwt_secret_key_here
   NODE_ENV=development
   ```

### Running the Application

#### Development Mode (Both servers)
```bash
npm run dev
```

This will start:
- Backend API server on `http://localhost:5000`
- Frontend React app on `http://localhost:3000`

#### Individual Servers

**Backend only:**
```bash
npm run server
```

**Frontend only:**
```bash
npm run client
```

#### Production Build
```bash
npm run build
npm start
```

## 📱 Usage

### Getting Started
1. **Register** a new account or **Login** with existing credentials
2. **Add transactions** to track expenses
3. **Create groups** for shared expenses with friends or family
4. **Split expenses** equally or with custom amounts
5. **View balances** to see who owes whom
6. **Settle up** when payments are made

### Adding a Transaction
1. Click "Add Transaction" button
2. Enter description and amount
3. Select category and payment type
4. Add participants and their shares
5. Optionally assign to a group
6. Click "Create Transaction"

### Creating a Group
1. Navigate to Groups page
2. Click "Create Group"
3. Enter group name and description
4. Add members to the group
5. Start adding group expenses

### Settling Balances
1. Go to Balances page
2. View people you owe or who owe you
3. Click "Settle" to record a payment
4. Enter amount and optional note

## 🏗️ Project Structure

```
smart-split/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── context/       # React context (Auth)
│   │   ├── pages/         # Page components
│   │   ├── App.jsx        # Main app component
│   │   ├── main.jsx       # Entry point
│   │   └── index.css      # Global styles
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/                # Node.js backend
│   ├── data/             # JSON database storage
│   ├── middleware/       # Express middleware
│   ├── routes/           # API routes
│   │   ├── auth.js       # Authentication
│   │   ├── transactions.js
│   │   ├── groups.js
│   │   ├── users.js
│   │   └── settlements.js
│   ├── utils/            # Utility functions
│   │   └── db.js         # Database operations
│   └── index.js          # Server entry point
├── .env.example          # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Users
- `GET /api/users/me` - Get current user
- `PUT /api/users/me` - Update profile
- `GET /api/users/search?query=` - Search users
- `GET /api/users/:id` - Get user by ID

### Transactions
- `GET /api/transactions` - Get all transactions
- `POST /api/transactions` - Create transaction
- `GET /api/transactions/:id` - Get transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Groups
- `GET /api/groups` - Get all groups
- `POST /api/groups` - Create group
- `GET /api/groups/:id` - Get group details
- `PUT /api/groups/:id` - Update group
- `POST /api/groups/:id/members` - Add member

### Settlements
- `GET /api/settlements` - Get settlements
- `POST /api/settlements` - Create settlement
- `GET /api/settlements/balances` - Get balances

## 🎨 Technologies Used

### Frontend
- **React 18** - UI library
- **React Router** - Navigation
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Vite** - Build tool

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **UUID** - ID generation
- **JSON File Storage** - Simple database

## 💾 Data Storage

This application uses a JSON file-based database located at `server/data/db.json`. The database structure includes:

```json
{
  "users": [],
  "transactions": [],
  "groups": [],
  "settlements": []
}
```

**Note:** For production use, consider migrating to a proper database like MongoDB, PostgreSQL, or MySQL.

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token-based authentication
- Protected API routes with middleware
- Input validation
- CORS enabled

## 🎯 Key Features Comparison

| Feature | Smart Split | Splitwise | 
|---------|-------------|-----------|
| Expense Splitting | ✅ | ✅ | 
| Group Management | ✅ | ✅ | 
| Balance Tracking | ✅ | ✅ | 
| Bank Integration | ⏳ Planned | ❌ | 
| WhatsApp Sharing | ⏳ Planned | ❌ | 
| Multiple Currencies | ⏳ Planned | ✅ | 
| Mobile App | ⏳ Planned | ✅ | 

## 🚧 Future Enhancements

- [ ] Bank account integration via RBI-approved aggregators
- [ ] WhatsApp sharing functionality
- [ ] Multiple currency support
- [ ] Recurring expenses
- [ ] Expense categories with icons
- [ ] Export to CSV/PDF
- [ ] Email notifications
- [ ] Mobile apps (iOS/Android)
- [ ] Receipt photo upload
- [ ] Advanced analytics and reports

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

Built with ❤️ by the Smart Split Team

## 📞 Support

For support, email support@smartsplit.com or create an issue in the repository.

---

**Note:** This is a demo application for educational purposes. For production deployment, ensure proper security measures, use a production-grade database, and implement additional features as needed.
