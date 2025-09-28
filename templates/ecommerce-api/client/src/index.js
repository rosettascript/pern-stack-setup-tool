import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Import styles
import './index.css';
import 'react-toastify/dist/ReactToastify.css';

// Import components
import App from './App';
import store from './store';

// Initialize Stripe (replace with your publishable key)
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_...');

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <Elements stripe={stripePromise}>
          <App />
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </Elements>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);

// Service worker registration (optional)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // You can register a service worker here for PWA functionality
    // navigator.serviceWorker.register('/sw.js');
  });
}