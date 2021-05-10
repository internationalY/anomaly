import React from 'react';
import TitleBar from '../TitleBar';
import './index.css';

export default class Filter extends React.Component {
  render() {
    return (
      <div className="filter">
        <TitleBar title="Filter"></TitleBar>
      </div>
    );
  }
}
