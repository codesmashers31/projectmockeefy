import React from "react";
import { MentorJobCard, MentorProfile } from "./MentorJobCard";

interface ExpertCardProps {
    mentor: MentorProfile;
}

const ExpertCard: React.FC<ExpertCardProps> = ({ mentor }) => {
    return <MentorJobCard mentor={mentor} />;
};

export default ExpertCard;
