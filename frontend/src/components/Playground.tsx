import { useState } from "react";

function Playground() {
  const [isRedirect, setIsRedirect] = useState(false);
  return (
    <div>
      <div className="playground">
        <div className="container">
          <div className="inner-wrap">
            <div className="inner-links tabs" role="tablist">
              <button
                className={`inner-link tab${isRedirect ? "" : " active"}`}
                role="tab"
                aria-selected={!isRedirect}
                onClick={() => setIsRedirect(false)}
              >
                Shorten
              </button>
              <button
                className={`inner-link tab${isRedirect ? "active" : ""}`}
                role="tab"
                aria-selected={isRedirect}
                onClick={() => setIsRedirect(true)}
              >
                Redirect
              </button>
              <button
                onClick={async () => {
                  await fetch("/logout", { method: "POST" });
                  window.location.href = "/login";
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Playground;
