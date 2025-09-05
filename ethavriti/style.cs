/* Reset and Base Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

:root {
    --primary: #2e7d32;
    --primary-dark: #1b5e20;
    --primary-light: #4caf50;
    --secondary: #7cb342;
    --accent: #f9a825;
    --light: #f1f8e9;
    --dark: #212121;
    --gray: #f5f5f5;
    --text: #333333;
}

body {
    background-color: #f8f9fa;
    color: var(--text);
    line-height: 1.6;
    overflow-x: hidden;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

/* Navigation */
nav {
    background-color: white;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    position: fixed;
    top: 0;
    width: 100%;
    z-index: 1000;
    transition: all 0.3s ease;
}

.nav-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
}

.nav-logo {
    display: flex;
    align-items: center;
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--primary);
}

.nav-logo img {
    height: 40px;
    margin-right: 10px;
}

.nav-links {
    display: flex;
    list-style: none;
}

.nav-links li {
    margin-left: 2rem;
}

.nav-links a {
    text-decoration: none;
    color: var(--dark);
    font-weight: 500;
    transition: color 0.3s;
    position: relative;
}

.nav-links a:hover, .nav-links a.active {
    color: var(--primary);
}

.nav-links a.active::after {
    content: "";
    position: absolute;
    bottom: -5px;
    left: 0;
    width: 100%;
    height: 2px;
    background-color: var(--primary);
}

.menu-toggle {
    display: none;
    font-size: 1.5rem;
    cursor: pointer;
}

/* Fullpage Sections */
.fullpage-section {
    min-height: 100vh;
    padding: 80px 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

/* Home Section */
#home {
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
    color: white;
    text-align: center;
    position: relative;
    overflow: hidden;
}

#home::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" opacity="0.1"><circle cx="50" cy="50" r="40" fill="white"/></svg>');
    opacity: 0.1;
}

.hero-content h1 {
    font-size: 4rem;
    margin-bottom: 1rem;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.hero-content h2 {
    font-size: 1.8rem;
    margin-bottom: 2rem;
    font-weight: 300;
}

.founder-profile {
    margin: 2rem 0;
}

.profile-img {
    width: 200px;
    height: 200px;
    border-radius: 50%;
    object-fit: cover;
    border: 5px solid white;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.scroll-button {
    display: inline-block;
    margin-top: 2rem;
    color: white;
    font-size: 2rem;
    animation: bounce 2s infinite;
}

@keyframes bounce {
    0%, 20%, 50%, 80%, 100% {
        transform: translateY(0);
    }
    40% {
        transform: translateY(-10px);
    }
    60% {
        transform: translateY(-5px);
    }
}

/* Section Titles */
.section-title {
    text-align: center;
    margin-bottom: 3rem;
    color: var(--primary-dark);
    font-size: 2.5rem;
    position: relative;
}

.section-title::after {
    content: "";
    display: block;
    width: 80px;
    height: 4px;
    background-color: var(--accent);
    margin: 0.5rem auto;
}

/* Cards */
.flex-container {
    display: flex;
    flex-wrap: wrap;
    gap: 2rem;
    justify-content: center;
}

.card {
    background: white;
    border-radius: 10px;
    padding: 2rem;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    flex: 1 1 300px;
    transition: transform 0.3s;
}

.card:hover {
    transform: translateY(-5px);
}

.card h3 {
    color: var(--primary-dark);
    margin-bottom: 1rem;
    font-size: 1.5rem;
}

/* Process Section */
.process-steps {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    margin: 3rem 0;
    position: relative;
}

.process-steps::before {
    content: "";
    position: absolute;
    top: 60px;
    left: 0;
    right: 0;
    height: 3px;
    background-color: var(--primary-light);
    z-index: 1;
}

.step {
    text-align: center;
    flex: 1;
    position: relative;
    z-index: 2;
    min-width: 200px;
    margin-bottom: 2rem;
}

.step-icon {
    width: 120px;
    height: 120px;
    background: var(--primary);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1rem;
    font-size: 2.5rem;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.step-title {
    font-weight: bold;
    margin-bottom: 0.5rem;
    color: var(--primary-dark);
}

.chemical-equation {
    background: white;
    padding: 2rem;
    border-radius: 10px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    margin-top: 2rem;
    text-align: center;
}

.equation {
    font-style: italic;
    margin: 1rem 0;
    overflow-x: auto;
}

/* Benefits Section */
.benefit-list {
    list-style: none;
}

.benefit-list li {
    padding: 1rem 0;
    position: relative;
    padding-left: 3rem;
    margin-bottom: 0.5rem;
}

.benefit-list li::before {
    content: "✓";
    color: var(--primary);
    position: absolute;
    left: 1rem;
    top: 1rem;
    font-size: 1.5rem;
    font-weight: bold;
}

.proof-box {
    background: var(--primary-dark);
    color: white;
    padding: 2rem;
    border-radius: 10px;
    margin-top: 2rem;
    text-align: center;
}

/* Market Section */
.market-table {
    width: 100%;
    border-collapse: collapse;
    margin: 2rem 0;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    border-radius: 10px;
    overflow: hidden;
}

.market-table th, .market-table td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid #ddd;
}

.market-table th {
    background-color: var(--primary);
    color: white;
}

.market-table tr:nth-child(even) {
    background-color: var(--gray);
}

.market-table tr:last-child td {
    border-bottom: none;
}

/* Contact Section */
.contact-content {
    display: flex;
    flex-wrap: wrap;
    gap: 2rem;
}

.contact-info, .contact-form {
    flex: 1 1 300px;
}

.contact-info {
    background: white;
    padding: 2rem;
    border-radius: 10px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.footer-logo {
    display: flex;
    align-items: center;
    font-size: 1.8rem;
    font-weight: bold;
    color: var(--primary);
    margin-bottom: 1rem;
}

.footer-logo img {
    height: 50px;
    margin-right: 10px;
}

.meaning {
    margin: 1rem 0;
    font-style: italic;
    opacity: 0.9;
}

.contact-details {
    margin: 1.5rem 0;
}

.social-links {
    margin-top: 1rem;
}

.social-links a {
    color: var(--primary);
    font-size: 1.5rem;
    margin: 0 0.5rem;
    transition: opacity 0.3s;
}

.social-links a:hover {
    opacity: 0.8;
}

.contact-form {
    background: white;
    padding: 2rem;
    border-radius: 10px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.contact-form h3 {
    margin-bottom: 1.5rem;
    color: var(--primary-dark);
}

.contact-form input, .contact-form textarea {
    width: 100%;
    padding: 0.8rem;
    margin-bottom: 1rem;
    border: 1px solid #ddd;
    border-radius: 5px;
    font-size: 1rem;
}

.contact-form button {
    background: var(--primary);
    color: white;
    border: none;
    padding: 1rem 2rem;
    border-radius: 5px;
    cursor: pointer;
    font-size: 1rem;
    transition: background 0.3s;
}

.contact-form button:hover {
    background: var(--primary-dark);
}

/* Responsive Design */
@media (max-width: 768px) {
    .menu-toggle {
        display: block;
    }
    
    .nav-links {
        position: fixed;
        top: 70px;
        left: -100%;
        width: 100%;
        height: calc(100vh - 70px);
        background: white;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        transition: left 0.3s ease;
    }
    
    .nav-links.active {
        left: 0;
    }
    
    .nav-links li {
        margin: 1.5rem 0;
    }
    
    .hero-content h1 {
        font-size: 2.5rem;
    }
    
    .hero-content h2 {
        font-size: 1.3rem;
    }
    
    .process-steps::before {
        display: none;
    }
    
    .step {
        flex: 0 0 100%;
        margin-bottom: 2rem;
    }
    
    .section-title {
        font-size: 2rem;
    }
    
    .profile-img {
        width: 150px;
        height: 150px;
    }
}
