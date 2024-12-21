import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

function Dashboard() {
  const [qrCode, setQrCode] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      checkWhatsAppStatus();
    }
  }, [user, navigate]);

  const checkWhatsAppStatus = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get('/api/users/whatsapp-status', {
        withCredentials: true
      });
      setIsConnected(response.data.connected);
      if (!response.data.connected) {
        getQRCode();
      }
    } catch (error) {
      setError('Erreur de vérification du statut: ' + (error.response?.data?.error || error.message));
      console.error('Erreur de vérification du statut:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQRCode = async () => {
    try {
      setError('');
      const response = await axios.get('/api/transcripts/whatsapp-qr', {
        withCredentials: true
      });
      
      if (response.data.status === 'connected') {
        setIsConnected(true);
        return;
      }
      
      if (response.data.qr) {
        setQrCode(response.data.qr);
      } else if (response.data.status === 'pending') {
        // Réessayer après un court délai
        setTimeout(getQRCode, 2000);
      }
    } catch (error) {
      setError('Erreur de récupération du QR code: ' + (error.response?.data?.error || error.message));
      console.error('Erreur de récupération du QR code:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      setError('Erreur de déconnexion: ' + error.message);
      console.error('Erreur de déconnexion:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Déconnexion
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {isConnected ? (
          <div className="text-center p-4 bg-green-100 rounded">
            <p className="text-green-700">WhatsApp est connecté !</p>
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-xl mb-4">Scanner le QR Code WhatsApp</h2>
            {qrCode && (
              <img
                src={`data:image/png;base64,${qrCode}`}
                alt="QR Code WhatsApp"
                className="mx-auto mb-4"
              />
            )}
            <p className="text-gray-600">
              Ouvrez WhatsApp sur votre téléphone et scannez ce code
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;