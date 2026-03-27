import { useState } from "react";
import axios from "axios";
import { Lock, Eye, EyeOff } from "lucide-react";

const API_URL = "http://localhost:8000";

export default function ForgotPassword() {
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/reset-password`, {
        username,
        new_password: newPassword,
      });
      setMessage("✅ Password updated successfully");
    } catch {
      setMessage("❌ User not found");
    }
  };

  return (
    <div className="fp-container">
      <div className="fp-card">

        <div className="fp-icon">
          <Lock size={28} />
        </div>

        <h2>Reset Password</h2>
        <p>Secure your account with a new password</p>

        {message && <div className="fp-message">{message}</div>}

        <form onSubmit={handleReset}>

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          {/* Password Field with Toggle */}
          <div className="fp-password">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <span onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </span>
          </div>

          <button type="submit">Reset Password</button>
        </form>
      </div>
    </div>
  );
}