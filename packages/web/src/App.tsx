import React from 'react';
import './App.css';
import Relation from './components/Relation';
import Map from './components/Map';
import TextBubble from './components/TextBubble';
import Comparison from './components/Comparison';
import Control from './components/Control';
import RulesRelation from './components/RulesRelation';

const App: React.FC = () => {
  return (
    <div className="App">
      <div className="top">
        <Control></Control>
        <Map></Map>
        <RulesRelation></RulesRelation>
        {/* <Relation></Relation> */}
      </div>
      <div className="bottom">
        <Comparison></Comparison>
        <TextBubble></TextBubble>
      </div>
    </div>
  );
};

export default App;
