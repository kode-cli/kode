import React from 'react';

const projectName = '<%= projectName %>';

export default function App(): React.ReactElement {
  return (
    <div>
      <h1>{projectName}</h1>
      <p>Your new React app is ready.</p>
    </div>
  );
}
