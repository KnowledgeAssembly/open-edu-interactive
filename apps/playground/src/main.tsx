import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App.js';

const root = document.getElementById('app');
if (!root) throw new Error('playground: missing #app element');
ReactDOM.createRoot(root).render(
  React.createElement(BrowserRouter, null, React.createElement(App)),
);
