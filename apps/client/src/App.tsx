import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tickets from './pages/Tickets';
import Users from './pages/Users';
import TicketDetails from './pages/TicketDetails';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Dashboard />} />
      <Route path="/tickets" element={<Tickets />} />
      <Route path="/users" element={<Users />} />
      <Route path="/tickets/:id" element={<TicketDetails />} />
    </Routes>
  );
}

export default App;
