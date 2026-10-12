import { useResume } from '../../../context/ResumeContext';
import { Mail, Phone, MapPin, Globe, Github, Linkedin } from 'lucide-react';

export function ModernResumeTemplate() {
  const { resumeData } = useResume();
  const { personalDetails, objective, skills, education, experience, projects, certifications, achievements } =
    resumeData;

  return (
    <div className="bg-white p-8 sm:p-10 text-gray-900 font-sans space-y-6 break-words [overflow-wrap:anywhere]">
      {/* Header */}
      <div className="border-b-2 border-[#0755E8] pb-6">
        <div className="mb-3">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">{personalDetails.fullName || 'Your Name'}</h1>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-600">
          {personalDetails.email && (
            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#0755E8]" />
              <span>{personalDetails.email}</span>
            </div>
          )}
          {personalDetails.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-[#0755E8]" />
              <span>{personalDetails.phone}</span>
            </div>
          )}
          {personalDetails.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#0755E8]" />
              <span>{personalDetails.location}</span>
            </div>
          )}
          {personalDetails.portfolio && (
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#0755E8]" />
              <a
                href={personalDetails.portfolio}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0755E8] hover:underline"
              >
                Portfolio
              </a>
            </div>
          )}
          {personalDetails.linkedIn && (
            <div className="flex items-center gap-1.5">
              <Linkedin className="w-3.5 h-3.5 text-[#0755E8]" />
              <a
                href={personalDetails.linkedIn}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0755E8] hover:underline"
              >
                LinkedIn
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Professional Summary */}
      {objective?.objective && (
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-2 border-b-2 border-[#0755E8] pb-1 tracking-wide">
            PROFESSIONAL SUMMARY
          </h2>
          <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">{objective.objective}</p>
        </div>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-2 border-b-2 border-[#0755E8] pb-1 tracking-wide">
            SKILLS
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {skills.map(skill => (
              <div
                key={skill.id}
                className="inline-block px-2.5 py-0.5 bg-[#EAF2FF] text-[#0755E8] text-xs font-semibold rounded-md border border-[#93B8FF]/40"
              >
                {skill.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Experience */}
      {experience.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3 border-b-2 border-[#0755E8] pb-1 tracking-wide">
            EXPERIENCE
          </h2>
          <div className="space-y-4">
            {experience.map(exp => (
              <div key={exp.id} className="border-l-2 border-[#0755E8] pl-3.5">
                <div className="flex justify-between items-baseline">
                  <h3 className="text-sm font-bold text-gray-900">{exp.position}</h3>
                  <span className="text-xs text-gray-600">
                    {exp.startDate} - {exp.currentlyWorking ? 'Present' : exp.endDate}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{exp.companyName}</p>
                {exp.location && <p className="text-xs text-gray-500">{exp.location}</p>}
                {exp.description.length > 0 && (
                  <ul className="mt-2 ml-4 text-xs text-gray-700 space-y-1">
                    {exp.description.map((bullet, idx) => (
                      <li key={idx} className="list-disc">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {education.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3 border-b-2 border-[#0755E8] pb-1 tracking-wide">
            EDUCATION
          </h2>
          <div className="space-y-3">
            {education.map(edu => (
              <div key={edu.id} className="border-l-2 border-[#0755E8] pl-3.5">
                <div className="flex justify-between items-baseline">
                  <h3 className="text-sm font-bold text-gray-900">
                    {edu.degree} in {edu.fieldOfStudy}
                  </h3>
                  <span className="text-xs text-gray-600">
                    {edu.startYear} - {edu.endYear}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{edu.institute}</p>
                {edu.percentage && (
                  <p className="text-xs text-gray-500">Grade: {edu.percentage}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3 border-b-2 border-[#0755E8] pb-1 tracking-wide">
            PROJECTS
          </h2>
          <div className="space-y-3">
            {projects.map(proj => (
              <div key={proj.id} className="border-l-2 border-[#0755E8] pl-3.5">
                <h3 className="text-sm font-bold text-gray-900">{proj.projectName}</h3>
                {proj.techStack.length > 0 && (
                  <p className="text-xs text-gray-600">
                    Tech: {proj.techStack.join(', ')}
                  </p>
                )}
                <p className="text-xs text-gray-700 mt-1">{proj.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {certifications.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-2 border-b-2 border-[#0755E8] pb-1 tracking-wide">
            CERTIFICATIONS
          </h2>
          <div className="space-y-2">
            {certifications.map(cert => (
              <div key={cert.id} className="text-xs">
                <p className="font-medium text-gray-900">
                  {cert.certificationName} - {cert.issuingOrganization}
                </p>
                <p className="text-gray-600">{cert.issueDate}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-gray-900 mb-2 border-b-2 border-[#0755E8] pb-1 tracking-wide">
            ACHIEVEMENTS
          </h2>
          <ul className="text-xs text-gray-700 space-y-1">
            {achievements.map(ach => (
              <li key={ach.id} className="list-disc list-inside">
                <span className="font-medium">{ach.title}</span> - {ach.description}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
