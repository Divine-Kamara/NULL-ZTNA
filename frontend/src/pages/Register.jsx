import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Card from '../components/Card';
import FormField from '../components/FormField';
import Button from '../components/Button';
import Toast from '../components/Toast';
import api from '../utils/api';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear field-specific error
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await api.post('/auth/register', {
        full_name: formData.fullName,
        email: formData.email,
        password: formData.password
      });

      setToast({ type: 'success', message: 'Registration successful. Redirecting to login...' });
      setTimeout(() => {
        navigate('/login', { state: { registered: true, email: formData.email } });
      }, 2000);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Registration failed. Please try again.';
      setToast({ type: 'error', message: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-null-bg">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <h1 className="font-mono text-3xl font-bold tracking-widest text-null-text">
            NULL<span className="text-null-signal font-mono text-sm">//ZTNA</span>
          </h1>
          <p className="font-sans text-xs text-null-muted mt-1 uppercase tracking-wider">
            Zero Trust Network Access Portal
          </p>
        </div>

        {/* Card Frame */}
        <Card title="Create Account" subtitle="Enroll a new identity credential">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
            <FormField
              label="Full Name"
              id="fullName"
              placeholder="e.g. John Doe"
              value={formData.fullName}
              onChange={handleChange}
              error={errors.fullName}
              required
              disabled={loading}
            />

            <FormField
              label="Email Address"
              id="email"
              type="email"
              placeholder="e.g. j.doe@company.local"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              required
              disabled={loading}
            />

            <FormField
              label="Password"
              id="password"
              type="password"
              placeholder="Min. 8 characters"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              required
              disabled={loading}
            />

            <FormField
              label="Confirm Password"
              id="confirmPassword"
              type="password"
              placeholder="Re-enter password"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              required
              disabled={loading}
            />

            <Button
              type="submit"
              variant="primary"
              className="mt-2 py-2.5"
              disabled={loading}
            >
              {loading ? 'Creating Credentials...' : 'Register Identity'}
            </Button>
          </form>

          {/* Nav Footer */}
          <div className="text-center mt-6 pt-4 border-t border-null-border">
            <p className="font-sans text-xs text-null-muted">
              Already enrolled?{' '}
              <Link to="/login" className="text-null-info hover:underline hover:text-null-text font-medium">
                Log in here
              </Link>
            </p>
          </div>
        </Card>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Register;
