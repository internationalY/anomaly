import React from 'react';
import './index.css';
import App from './App';
import dva from 'dva';
import models from '../src/models';
import 'react-perfect-scrollbar/dist/css/styles.css';
// import * as serviceWorker from './serviceWorker';

const app = dva();

app.router(() => <App />);

models.forEach(model => app.model(model));

app.start('#root');

// ReactDOM.render(<App />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
// serviceWorker.unregister();
