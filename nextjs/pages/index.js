import React from 'react';
import {observer} from "mobx-react";
import { withRouter } from 'next/router';


const Home = observer(class Home extends React.Component {

  constructor(props) {
    super(props);
    this.state = { }
  }

  componentDidMount() {}
  componentWillUnmount() {}

  render() {
    return (
        <div>

        </div>
    )
  }
})

export default withRouter(Home);
