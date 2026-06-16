# AT3b Software Engineering Project Hand-In

**Due:** Tuesday, 21 July 2026 at 15:30  
**Points Possible:** 85  
**Attempts Allowed:** Unlimited  
**Status:** In Progress

---

## Assessment Overview

| Field | Details |
|---|---|
| **School** | The King's School |
| **Year & Subject** | Year 12 Software Engineering |
| **Task Number** | 3 |
| **Task Weighting** | 25% |
| **Timing** | Term 3, Week 1 |
| **Type of Task** | Project |
| **Submission Details** | Online |
| **Feedback** | Provided within the Assessment Task or verbally in class |
| **Outcomes Assessed** | SE-12-01, SE-12-02, SE-12-03, SE-12-04, SE-12-05, SE-12-07, SE-12-08, SE-12-09 |

---

## Nature of the Task

### Scenario

You are tasked with developing a web application that addresses a real-world need or problem. The application should be designed to be user-friendly, functional, and provide a meaningful service or solution. Your project can be tailored to any area of interest, including:

- Education
- Entertainment
- Productivity
- Health
- Social Engagement

The web app should feature personalised elements where applicable (such as customisable settings or AI-driven recommendations), and must prioritise security to protect user data. The application's design, features, and overall purpose are entirely up to you, with the goal of creating a web-based solution that enhances user experience securely and meaningfully.

### Task Description

This project begins with:
1. Defining the client scenario
2. Documenting the environmental specifications
3. Establishing a clear list of objectives outlining what the application must achieve

The web application **must be built using Flask** as the framework. It must have:
- A **backend database** to store user information
- A **frontend** to display a user interface

> A tutorial on making a To-Do app will be provided as a starting basis.

> **Note:** Students can create custom apps that do not use the Flask format; however, this requires **teacher approval** before starting.

During development, students are expected to:
- Use **version control** (GitHub) to manage code changes
- Conduct regular **code reviews**
- Adhere to good **Object-Oriented Programming (OOP)** practices
- Write well-structured code with **internal documentation**
- Implement **advanced features** that enhance user experience
- Follow **security-by-design** principles to protect user data and minimise vulnerabilities
- Complete and submit all **documentation on SharePoint**, checked according to milestones

---

## Artificial Intelligence Guidelines

Students are encouraged to utilise AI tools to assist with research and practical aspects. However, the following guidelines must be adhered to:

1. **Individual Effort:** Each student must complete every step independently. Students must be able to understand and explain each step they take.

2. **Documentation and Logs:** Students must maintain detailed logs of their work, including:
   - Use of AI tools
   - Steps taken and outcomes achieved
   - All prompts used
   These logs serve as evidence of engagement and understanding.

3. **Understanding and Explanation:** Students must articulate what they have learned and how they applied AI tools, including explaining decisions made and results obtained.

4. **Balanced Use of AI:** AI may be used for repetitive or complex tasks, but students must not rely solely on AI. A balance between manual effort and AI assistance is required to ensure hands-on experience and deep understanding.

---

## Section 3.1 — Development (10 Marks)

### 3.1.1 — Version Control *(5 Marks)*
Implement a version control system to track all changes to the codebase, enabling rollback capabilities and collaborative development.

### 3.1.2 — Logbook *(5 Marks)*
Develop a logbook for tracking changes and implementing significant features and changes/additions to the web application. Follow the styling guide provided in the course specs.

> **Milestone 3.1:** Checked at various points each term.

---

## Section 3.2 — Full Stack Web Application (50 Marks)

### 3.2.1 — Web Application

#### User Interface (UI)
- **Intuitive Design:** Clean and straightforward interface for easy navigation.  
  *Example: A navigation bar with links to "Home," "Profile," and "Settings." Clearly labelled buttons like "Add Task" or "Save Changes."*

- **Responsiveness:** Application adapts seamlessly to different devices.  
  *Example: A to-do list app displaying tasks in a desktop grid and a vertical list on mobile.*

- **Customisation:** Allow users to personalise the app based on preferences.  
  *Example: A dashboard where users can rearrange widgets (e.g., calendar, weather, quick links).*

- **Accessibility:** Features for inclusivity such as keyboard navigation or screen reader compatibility.  
  *Example: Alt text on images; buttons navigable with the Tab key.*

#### Core Features
- **Primary Functionality:** Deliver key features to address a problem or need.  
  *Example: An event management app with features for creating events, sending invites, and tracking RSVPs.*

- **Dynamic Content:** App responds to user interactions without page reloads.  
  *Example: A weather app that updates the forecast when a user selects a different city.*

- **Basic CRUD Operations:** Enable users to manage data effectively (Create, Read, Update, Delete).  
  *Example: A notes app where users can add, view, edit, and delete notes.*

- **User Authentication:** Secure user accounts with login functionality.  
  *Example: A login page with email/password fields, a "Remember Me" checkbox, and a password reset option.*

#### Data Management
- **Data Storage:** Use a database to handle user or application data.  
  *Example: A task tracker storing tasks with title, due date, and completion status in PostgreSQL or Firebase.*

- **Secure Handling:** Protect data through encryption during storage and transmission.  
  *Example: Store passwords using bcrypt hashing; ensure API requests use HTTPS.*

- **Data Privacy:** Implement role-based access controls.  
  *Example: In an online classroom, only teachers access student grades; students view only their own.*

#### Security Features
- **Authentication:** Verify user identity.  
  *Example: Use authentication for login.*

- **Authorisation:** Limit user access to appropriate features.  
  *Example: Only admins can delete accounts in a blogging platform.*

- **Data Validation:** Prevent malicious input from compromising the application.  
  *Example: Sanitise form input to prevent SQL injection using prepared statements.*

- **Error Handling:** Protect sensitive information by displaying generic error messages.  
  *Example: Display "Oops! Something went wrong." instead of exposing database details.*

#### AI / Advanced Features
- **Personalisation:** Enhance user experience with tailored content.  
  *Example: An e-learning platform suggesting courses based on learning history.*

- **Automation:** Simplify processes through AI-driven automation.  
  *Example: A scheduling app that suggests optimal meeting times based on participants' availability.*

- **PWA Implementation:** Implement service workers and a `manifest.json` to run the app locally without an internet connection.  
  *Example: A map app that functions offline.*

- **OOP Game:** Create an OOP-style game demonstrating principles such as Inheritance, Polymorphism, Abstraction, and Generalisation.  
  *Example: A Snake game embedded within the website.*

- **Chat Bot:** Create a chatbot to assist users with website usage or FAQs.  
  *Example: A chatbot that suggests how to schedule a meeting or add a TO-DO item.*

- **Interactivity:** Use JavaScript for dynamic, custom page/route generation.  
  *Example: A custom profile page based on user preferences, such as a custom map integration or school logo picker.*

- **Predictive Analysis:** Offer AI-driven insights or forecasts.  
  *Example: A budgeting app predicting monthly savings based on spending habits.*

#### Video Walkthrough
- A walkthrough video of the practical project must be included.
- The video should go through each section of the task step by step.
- **Maximum viewing time: 15 minutes per attachment.**

> **Milestone 3.2:** Checked at various points each term.

---

## Section 4 — Testing and Maintaining (10 Marks)

### 4.1 — Acceptance Testing
Apply methodologies to test and evaluate whether the application meets all outlined requirements and objectives.

### 4.2 — Load Testing
Apply methodologies to test and evaluate the application's stability and performance under different levels of usage and load.

### 4.3 — User Survey
Collect feedback through a survey to analyse and respond to feedback on the application's usability, functionality, and overall satisfaction.

**This section also involves:**
- Developing a report to synthesise feedback
- Developing a test plan
- Comparing actual output with expected output

> **Milestone 4:** Should be completed by Term 2, Week 9.

---

## Section 6 — Stand Up (15 Marks)

The Stand Up is a **two-way discussion** between the examiner and student in which the student demonstrates understanding of concepts from the assessment task. It involves questions and answers where the student demonstrates subject knowledge and the originality of their ideas.

### Topics Covered
Students will be allocated random questions from:
- Identifying/defining & Research/planning
- Producing and implementing
- Security
- Testing and evaluating

### Rules
- You may **not bring any notes.**
- Questions are created only from topics in the assessment task.

### Preparation Tips
1. Take a moment to think carefully about what is being asked before answering.
2. Be concise and clear; use key course terminology.
3. Practice answers with peers and seek feedback.
4. Demonstrate understanding using appropriate examples.
5. Be positive, articulate, and knowledgeable.

### Sample Questions

| Topic | Example Question |
|---|---|
| Identifying/defining & Research/planning | What process did you undertake to determine the data, data types, and structure of data to use in your project? |
| Producing and implementing | When conducting your risk analysis, what were the main issues that arose with your project? |
| Security | What was the greatest barrier you faced in the security of your system? |
| Testing and evaluating | How did you periodically modify your designs to improve functionality? |

### Assessment Criteria for Stand Up
Students will be assessed on how well they:
- Respond to impromptu questions
- Demonstrate understanding of course content
- Use accurate and relevant examples to support responses
- Use evidence and examples from stimuli and their project
- Communicate information and ideas clearly using analysis, critical thinking, and syllabus terminology

### Duration
**10–15 minutes.** No written material permitted. Students should get straight to the point, use examples immediately, and avoid labouring points.

---

## Resources

| Resource | Type |
|---|---|
| Version Control | Link |
| Logbook | Link |
| Code Review | Link |
| Acceptance Testing | Link |
| Load Testing | Link |
| User Survey | Link |
| Functional Prototype | Link |
| Documentation Scaffold | Download |
| AT3 Logbook Scaffold | Download |
| AT3 Part 2 Scaffold | Download |

---

## Policies

*Attempt/Submission of this assessment indicates agreement with the following policies and processes.*

### ICT Malpractice
- Students must take responsibility for safely backing up their Assessment Task.
- Create a copy on an external USB drive **and** utilise cloud storage (e.g., Microsoft OneDrive).

### Academic Integrity
- Refer to the Academic Integrity and Malpractice policies on KingsNet for referencing, citations, and correct referencing.
- Assistance for correct referencing is available via the Senior Library.

**In cases of suspected plagiarism, students may be required to provide evidence that all unacknowledged work is entirely their own, including:**
- Evidence of the process of their work (diaries, journals, notes, working plans, sketches, progressive drafts)
- Where AI/ML technologies (e.g., ChatGPT) are suspected to have been used, students may need to demonstrate understanding of the task and explain their thought process and decision-making
- Answer questions regarding the assessment task under investigation

---

## Marking Rubric

### Version Control — /5 pts

| Level | Description | Points |
|---|---|---|
| Extensive | Version control is extensive and effectively implemented with detailed commit messages; code reviews are thorough; code is well-documented, secure, and adheres to best practices. | 5 |
| Thorough | Version control is thorough and used consistently; code reviews conducted and address most issues; code is well-structured with minor gaps. | 4 |
| Sound | Version control is sound but inconsistently applied; code reviews are limited or superficial; code lacks structure, security, or documentation in some areas. | 3 |
| Basic | Version control is basic; code reviews minimally implemented; code structure, security, or documentation insufficient. | 2 |
| Elementary | Version control, code reviews, and code quality are either elementary or limited. | 1 |
| No Marks | Not Achieved | 0 |

---

### Logbook — /5 pts

| Level | Description | Points |
|---|---|---|
| Extensive | Demonstrates extensive planning and documentation aligned with all stages of the Software Engineering process. Entries are regular, chronological, and follow course structure. Reflections show high-level insight with clear evidence of decision-making, problem-solving, and iteration. | 5 |
| Thorough | Thorough and consistent entries linked to most stages. Reflection shows good understanding with some evidence of iteration and response to challenges. | 4 |
| Sound | Sound entries over a semi-regular period, covering several stages. Reflections present but may be descriptive rather than analytical. | 3 |
| Basic | Infrequent or incomplete entries. Planning underdeveloped or inconsistent. Reflections minimal or superficial. | 2 |
| Elementary | Elementary understanding of the work. | 1 |
| No Marks | Not Achieved | 0 |

---

### User Interface — /5 pts

| Level | Description | Points |
|---|---|---|
| Extensive | Fully functional GUI delivering seamless user experience through intuitive layout, clear navigation, consistent design, accessibility, responsiveness, and engaging visual presentation. | 5 |
| Thorough | Fully functional GUI delivering seamless user experience, intuitive layout, clear navigation, and consistent design. | 4 |
| Sound | Partially functional GUI delivering a user experience with intuitive layout, clear navigation, and consistent design. | 3 |
| Basic | Basic functional GUI with basic layout, navigation, and design. | 2 |
| Elementary | Application is non-functional or demonstrates limited understanding. | 1 |
| No Marks | Not Achieved | 0 |

---

### Core Features — /10 pts

| Level | Description | Points |
|---|---|---|
| Extensive | Seamless integration of core features including primary functionality, dynamic content, CRUD operations, and secure user authentication. | 10–8 |
| Thorough | Integration of core features including primary functionality, dynamic content, CRUD operations, and secure user authentication. | 8–6 |
| Sound | Sound integration including primary functionality and dynamic content. | 6–4 |
| Basic | Basic integration including primary functionality and dynamic content. | 4–2 |
| Elementary | Core features are non-functional or demonstrate limited understanding. | 2–0 |
| No Marks | Not Achieved | 0 |

---

### Data Management — /5 pts

| Level | Description | Points |
|---|---|---|
| Extensive | Fully functional system with extensive data management: dedicated database storage, secure encryption at rest and in transit, and robust role-based access controls. | 5 |
| Thorough | Functional system with data management techniques including database storage and secure encryption at rest and in transit. | 4 |
| Sound | Sound functional system with some data management techniques. | 3 |
| Basic | Basic functional system with basic data management techniques. | 2 |
| Elementary | Application is non-functional or demonstrates limited understanding. | 1 |
| No Marks | Not Achieved | 0 |

---

### Security Features — /5 pts

| Level | Description | Points |
|---|---|---|
| Extensive | Fully functional system with extensive security features: authentication, authorisation, robust data validation, and comprehensive error handling with generic user-friendly messages. | 5 |
| Thorough | Working system with core security features: user authentication, basic data validation, access control, and generic error messages. | 4 |
| Sound | Functional system with a sound level of security: login authentication, minimal data validation, limited access control, and error messages that may reveal some information. | 3 |
| Basic | Functional system with basic security: login authentication, minimal validation, limited access control, and error messages that may reveal too much information. | 2 |
| Elementary | Application is non-functional or demonstrates limited understanding. | 1 |
| No Marks | Not Achieved | 0 |

---

### Advanced Features — /15 pts

| Level | Description | Points |
|---|---|---|
| Extensive | Fully functional system with at least three highly tested and well-implemented advanced features such as predictive analysis, automation, and personalisation. | 15–12 |
| Thorough | Fully functional system with at least three functional advanced features such as PWA implementation, dynamic interactivity for custom pages, and a functional chatbot. | 12–9 |
| Sound | Fully functional system with at least three foundational advanced features such as an OOP game and basic interactivity for dynamic content and animations. | 9–6 |
| Basic | Working system with at least three minimal advanced features such as a simple rule-based chatbot and basic client-side interactivity with JavaScript. | 6–3 |
| Elementary | Application is non-functional or demonstrates limited understanding. | 3–0 |
| No Marks | Not Achieved | 0 |

---

### Video Walkthrough — /10 pts

| Level | Description | Points |
|---|---|---|
| Extensive | Extensive, clear, well-structured video showcasing all application features and functionalities professionally and engagingly. | 10–8 |
| Thorough | Thorough and organised video demonstrating most features; minor issues in engagement or presentation. | 8–6 |
| Sound | Sound walkthrough with some omissions in feature coverage or organisation. | 6–4 |
| Basic | Basic walkthrough lacking clarity, excluding key features, or poorly presented. | 4–2 |
| Elementary | Walkthrough is missing or demonstrates elementary understanding. | 2–0 |
| No Marks | Not Achieved | 0 |

---

### Testing and Evaluation — /10 pts

| Level | Description | Points |
|---|---|---|
| Extensive | Extensive testing (acceptance and load) with detailed results; user feedback effectively analysed and used to refine the application; final evaluation provided. | 10 |
| Thorough | Thorough testing with informed results; user feedback effectively analysed and applied; final evaluation provided. | 8 |
| Sound | Sound testing but lacking depth in some aspects; user feedback collected but not well-analysed or applied; some final evaluation provided. | 6 |
| Basic | Minimal testing on basic aspects; user feedback vague or incomplete; little evidence of refinement. | 4 |
| Elementary | Testing and user feedback are either elementary or limited. | 2 |
| No Evidence | — | 0 |

---

### Stand Up Presentation — /15 pts

| Level | Description | Points |
|---|---|---|
| Extensive | Presentation is extensive, clear, and concise, demonstrating deep understanding, critical thinking, and robust application of syllabus concepts. | 15–12 |
| Thorough | Presentation is thorough and concise, demonstrating good understanding and application of syllabus concepts, with minor gaps in depth or clarity. | 12–9 |
| Sound | Presentation demonstrates sound understanding but lacks depth, clarity, or focus in some areas; use of examples is limited. | 9–6 |
| Basic | Presentation is basic with significant omissions or unclear delivery; limited demonstration of understanding or application of syllabus concepts. | 6–3 |
| Elementary | Presentation is elementary with little preparation or understanding of assessment criteria. | 3–0 |
| No Marks | Not Achieved | 0 |

---

## Mark Summary

| Section | Criteria | Max Marks |
|---|---|---|
| 3.1 | Version Control | 5 |
| 3.1 | Logbook | 5 |
| 3.2 | User Interface | 5 |
| 3.2 | Core Features | 10 |
| 3.2 | Data Management | 5 |
| 3.2 | Security Features | 5 |
| 3.2 | Advanced Features | 15 |
| 3.2 | Video Walkthrough | 10 |
| 4 | Testing and Evaluation | 10 |
| 6 | Stand Up Presentation | 15 |
| **Total** | | **85** |
