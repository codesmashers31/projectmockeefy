import DashboardLayout from "../components/DashboardLayout";
import CoachSessionCard from "../components/CoachSessionCard";

/**
 * "/" route (Home Page):
 * Displays Mockeefy's main DashboardLayout with CoachSessionCard (all verified mentor categories).
 * Both guests and registered candidates see our full list of mentors immediately, with no empty state.
 */
const Index = () => {
  return (
    <DashboardLayout>
      <CoachSessionCard />
    </DashboardLayout>
  );
};

export default Index;
