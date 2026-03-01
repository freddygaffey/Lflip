# This is my L plate app

it is  a project for my DT and IT hsc major work

## The Stack

- HTML
- CSS
- JavaScript
- Python
- Flask
- SQLite
- SQLAlchemy

## Purpose

The need is to make a service that automates the process of logging their hours as a learner driver as well as the hardware of the automated plate flipping. 

## Target Audience

Learner drivers and their fully licensed drivers, so therefore meet the accessibility requirements of having a driver's license.

## Primary Goals

The primary goal is to make an app/website that integrates with physical L plates, logs hours, and provides you with data analytics.

## The Story

Currently learner drivers often break the law by not filling their log books correctly out of laziness. Because the process takes 3 minutes to fill in but they are under pressure skip it, especially when parents are running late. You might even forget (intentionally or not) to put the L plates on. This is bad because it results in less qualified and capable drivers on the road. My MDP will solve this by making this whole process more efficient with my app and compatible hardware. The process of logging a drive should take very minimal time to complete; therefore, the logbook will always be filled in. The client's workflow should be to open their phone and press start, maybe indicate who the supervising driver is and then at the end, press stop or it will automatically stop when out of Bluetooth range.[GU1.1]

## System Environment

This project will exist over multiple platforms and networks that will mean that it is more complicated than I would like. There are 2 ESPs, one is simply a Bluetooth slave to the master. The master will have a GPS and an accelerometer on board the gps will run constant interpolation to figure out what the odometer is to keep that in sync as well as broadcasting a website this website will allow the user to start a trip and end one as well as some other features. Once the trip is logged it will be saved to an SD card on board. The master ESP32 will broadcast a Wi-Fi network if I can't connect to a saved home Wi-Fi network. If it can connect to the home wifi network, it will and it will send it to the server. Once the user is redirected back to the PWA the redirect request will contain the essential data from the trip so it can update the PWA dashboard.

## Objectives / Features

The objectives and features for my solution:

- Log trips GPS and accelerometer data
- In the GUI, have a way to view trip analytics, such as a map that colour-codes speed
- Due to mixed content blocking which is where a https website can't make a request to an http site, this is what is being served by the ESP32 so therefore I need two websites one that controls the hardware and the L plate and also one that is the main PWA. This integration should be as seamless as possible.
- The ability to track the day and night hours is probably displayed by 3 pie charts, one for each and one for the total
- The whole system can work offline, except for uploading, which requires internet
- An AI chatbot that has RAG for understanding road rules
- RBA that allows parents to approve drives once completed
- The app will be optimised around the speed to start a drive therefore, the app starts with a BRB (big red button) this is a UI design term that makes the app more efficient to use, that allows the user to go to a new page that allows them to start a drive or view drives

## Goal

The goal is to make an app that allows a user to quickly and easily log a drive and integrate with hardware – an ESP that will have a servo on it, BLE connected to a Capacitor app, as well as an OBD module plugged into the car to extract the odo so they don't have to input it manually. They will also be able to see their driving stats and history. Due to the limitation on Capacitor, the L plate will have an accelerometer in it so it can track g-force as Apple is annoying. 

## The Nonfunctional Requirements

- **Log a drive**
- See driving stats
- See driving history
- See driving map
- See driving route
- See driving distance
- track the progress of the user to the state requirements 
- have RBA for the parent to view and approve the drives

## The Features in More Detail

- **1. Login** (10) – Provide the user the ability to use pre-saved credentials to access protected areas of the system
- 1.1 – Login window (10) – Provide users with a screen which allows them to authenticate with the program. If a user tries to access a restricted location, redirect them to the login
- 1.2 – Email (10) – User can create an account with email. Must provide email at login. If not found prompt user to sign-up
- 1.3 – Password (10) – User uses a password with which to authenticate their account. Password must be 8 characters and contain numbers and symbols
- **2. Data logs from the plate** (10) – This data is saved from onboard sensors and then transmitted up to the cloud database
- 2.1 – Accelerometer data (5) – This data will be saved at a rate that will be determined later and then sent up to the cloud. The purpose of this data is so that it helps provide analytics to the user about driving style on things like braking or acceleration
- 2.2 – GPS data (10) – This is absolutely essential because this data is the way that the odometer is determined and also the trip distance
- 2.3 – Speed data (extrapolated from GPS in backend) (6) – This is data that tracks the speed in the vehicle also provides analytics on if you were speeding. This is a potential feature that might not be technically feasible to get if speeding
- **3. Plate battery data** (6) – Data on if the L plate is low on battery so that it can be charged
- 4.1 – Starting drive (10) – This must be really easy thing to do it must take under 10 seconds, it must also work offline
- 4.2 – Stopping drive (10) – This must be really easy thing to do it must take under 10 seconds, it must also work offline
- **5. The parent approves the drive** (9) – A parent/supervising driver must be able to approve a drive easily
- **6. Viewing the drives and being able to fill in the log book from that** (10) – The ability to view the logs in a format that is easy to transcribe into the physical log book

---

## The Performance Requirements

The L plate controller (hosted by the ESP32) should be fast and responsive, getting a score of 85+ on the Google Lighthouse. In order to solve the problem, the user must be able to start a drive in 10 seconds. This means that buttons must be easy to use, and that text inputs must be reduced and, ultimately, eliminated. The main website (pwa) should have an uptime of 90% this is much lower than the standard, as most websites, but this is because the website is a PWA and the critical functionality is all on the controller. To assess the success of the website, I will use data analytics to calculate user retention this should be 80%. If this is on the app store it should maintain 4/5 stars for the first month. The app should be scalable and be able to have 100 users concurrently.

## Data Flow Diagrams

### Logging a Drive

Shows how the Capacitor app, GPS, accelerometer, car OBD2, and SD card interact to log trip data from start to sync with the cloud.

Logging a Drive DFD

### Approving a Trip

Shows how the parent approves trips and how the log drive process flows from the learner through the logger to the app database and cloud.

Approving a Trip DFD

## Storyboard

### Dashboard & Logbook

Low-fidelity wireframe of the main dashboard with the AI chatbot for road rules questions, progress gauges (day, total, night hours), and the drives table showing log time, distance, supervising driver, hard braking count, and approval state.

Dashboard Storyboard