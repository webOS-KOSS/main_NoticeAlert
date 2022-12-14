import React from "react";
import { HashRouter as Router, Route, Switch } from "react-router-dom";
import Main from "../views/Main";

const App = () => {
  
  return (
    <Router>
      <Switch>
        <Route path='/' exact>
          <Main />
        </Route>
      </Switch>
    </Router>
  );
}

export default App;