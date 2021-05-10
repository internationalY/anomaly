import React from 'react';
import './index.css';
import { Props } from './interface';

export default class TitleBar extends React.Component<Props> {
  render() {
    return (
      <div className="title-bar">
        <span>{this.props.title}</span>
        <span className="fill-spacing"></span>
        <span className="actions">{this.props.actions}</span>
      </div>
    );
  }
}
