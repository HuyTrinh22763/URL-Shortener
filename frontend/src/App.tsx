import LoginForm from "./components/LoginForm";
import Playground from "./components/Playground";

function App() {
  if (window.location.pathname === "/login") return <LoginForm />;
  return <Playground />;
}

export default App;
