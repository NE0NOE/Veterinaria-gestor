# Max's Groomer - Veterinary Clinic Management System

Max's Groomer is a comprehensive web application designed to streamline the management of a veterinary clinic. It provides a user-friendly interface for managing appointments, pet and patient records, inventory, purchases, and user accounts. The system also includes a helpful food calculator for pet owners.

## Features

*   **Appointment Management:** Schedule and manage veterinary appointments.
*   **Pet and Patient Records:** Maintain detailed records for pets and patients.
*   **Inventory Control:** Track and manage clinic inventory.
*   **Purchase Management:** Record and manage purchases.
*   **User Management:** Manage user accounts and roles (client, administrator).
*   **Role-Based Access Control:** Separate dashboards and functionalities for clients and administrators.
*   **Food Calculator:** A utility to help calculate pet food requirements.
*   **User Authentication:** Secure user registration, login, and password reset.

## Technologies Used

*   **Frontend:**
    *   React
    *   Vite
    *   TypeScript
    *   Tailwind CSS
    *   React Router
    *   Framer Motion (for animations)
    *   Lucide React (for icons)
*   **Backend:**
    *   Supabase (for database, authentication, and other backend services)
*   **Development Tools:**
    *   ESLint (for linting)

## Getting Started

To get a local copy up and running, follow these simple steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/your-repository-name.git
    ```
    (Replace `https://github.com/your-username/your-repository-name.git` with the actual repository URL)
2.  **Navigate to the project directory:**
    ```bash
    cd your-repository-name
    ```
    (Replace `your-repository-name` with the actual directory name)
3.  **Install NPM packages:**
    ```bash
    npm install
    ```
4.  **Set up environment variables:**
    *   You will need to create a `.env` file in the root of the project and add your Supabase URL and Anon Key. You can get these from your Supabase project settings.
    *   Example `.env` file:
        ```env
        VITE_SUPABASE_URL=your_supabase_url
        VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
        ```
5.  **Run the development server:**
    ```bash
    npm run dev
    ```
    This will start the application, typically on `http://localhost:5173`.

## Scripts

The following scripts are available in the `package.json`:

*   `npm run dev`: Runs the app in development mode with hot reloading.
*   `npm run build`: Builds the app for production to the `dist` folder.
*   `npm run lint`: Lints the project files using ESLint.
*   `npm run preview`: Serves the production build locally for preview.

## Contributing

Contributions are welcome! If you have suggestions for improving the application, please feel free to fork the repository and submit a pull request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

(Note: You will need to create a `LICENSE` file in your project root if you choose to use a license like MIT.)
