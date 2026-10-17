import DashboardLayout from "../components/DashboardLayout";
import FindMentor from "./FindMentor";

/**
 * "/" route (Home Page / Interview Experts):
 * Displays Mockeefy's main DashboardLayout with FindMentor.
 * Visitors and candidates immediately land on the "Find Your Mentor" discovery directory.
 */
const Index = () => {
  return (
    <DashboardLayout>
      <FindMentor />
    </DashboardLayout>
  );
};

export default Index;
