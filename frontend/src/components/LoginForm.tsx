import { useState } from "react";
import googleIcon from "../assets/images/google.svg";

function LoginForm() {
  const [isRegister, setIsRegister] = useState(false);

  return (
    <>
      {/* Section Auth */}
      <div className="section-auth">
        <div className="container">
          <div className="inner-wrap">
            <div className="inner-item filled-card">
              <div className="inner-links tabs" role="tablist">
                <button
                  className={`inner-link tab${isRegister ? "" : " active"}`}
                  role="tab"
                  aria-selected={!isRegister}
                  onClick={() => setIsRegister(false)}
                >
                  Đăng nhập
                </button>
                <button
                  className={`inner-link tab${isRegister ? " active" : ""}`}
                  role="tab"
                  aria-selected={isRegister}
                  onClick={() => setIsRegister(true)}
                >
                  Đăng ký
                </button>
              </div>
              <a className="inner-submit-btn" href="/auth/google">
                <img src={googleIcon} alt="" width={22} height={22} />
                {isRegister ? "Đăng ký với Google" : "Đăng nhập với Google"}
              </a>
            </div>
          </div>
        </div>
      </div>
      {/* End Section Auth */}
    </>
  );
}

export default LoginForm;
