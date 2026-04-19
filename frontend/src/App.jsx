import Chatbot from './components/chatbot/Chatbot';
import './App.css';

function App() {
  return (
    <div className="App">
      <Chatbot 
        userId="student123"
        initialRiskLevel="MEDIUM"
        apiUrl={import.meta.env.DEV ? '' : 'http://localhost:5000'}
      />
    </div>
  );
}

export default App;