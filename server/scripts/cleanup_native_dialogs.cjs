const fs = require('fs');
const path = require('path');

// 1. ExpertsManager.tsx
{
  const file = path.join(__dirname, '../../client/src/components/ExpertsManager.tsx');
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/import Toast from '\.\/Toast';\r?\nimport { Toast as ToastType } from '\.\.\/types';/, "import Swal from 'sweetalert2';\nimport { toast } from 'sonner';");
  c = c.replace(/const \[toast, setToast\] = useState<ToastType \| null>\(null\);/, "");
  c = c.replace(/const showToast = \(message: string, type: ToastType\['type'\]\) => \{[\s\S]*?setToast\(\{[\s\S]*?\}\);\r?\n  \};/, `const showToast = (message: string, type: string) => {
    if (type === 'success') toast.success(message);
    else if (type === 'error') toast.error(message);
    else toast.info(message);
  };`);
  c = c.replace(/const handleDeleteExpert = \(expert: Expert\) => \{[\s\S]*?if \(window\.confirm\(`Are you sure you want to delete \${expert\.name}\?`\)\) \{[\s\S]*?\}\r?\n  \};/, `const handleDeleteExpert = async (expert: Expert) => {
    const res = await Swal.fire({
      title: 'Delete Expert?',
      text: \`Are you sure you want to delete \${expert.name}?\`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0755E8',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete',
    });
    if (res.isConfirmed) {
      const success = dataService.deleteExpert(expert.id);
      if (success) {
        loadData();
        showToast('Expert deleted successfully', 'success');
      } else {
        showToast('Failed to delete expert', 'error');
      }
    }
  };`);
  c = c.replace(/\{toast && \(\r?\n\s*<Toast[\s\S]*?\/>\r?\n\s*\)\}/, "");
  fs.writeFileSync(file, c, 'utf8');
  console.log('Updated ExpertsManager.tsx');
}

// 2. HRManager.tsx
{
  const file = path.join(__dirname, '../../client/src/components/HRManager.tsx');
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/import Toast from '\.\/Toast';\r?\nimport { Toast as ToastType } from '\.\.\/types';/, "import Swal from 'sweetalert2';\nimport { toast } from 'sonner';");
  c = c.replace(/const \[toast, setToast\] = useState<ToastType \| null>\(null\);/, "");
  c = c.replace(/const showToast = \(message: string, type: ToastType\['type'\]\) => \{[\s\S]*?setToast\(\{[\s\S]*?\}\);\r?\n  \};/, `const showToast = (message: string, type: string) => {
    if (type === 'success') toast.success(message);
    else if (type === 'error') toast.error(message);
    else toast.info(message);
  };`);
  c = c.replace(/const handleDeleteHR = \(hr: HR\) => \{[\s\S]*?if \(window\.confirm\(`Are you sure you want to delete \${hr\.name}\?`\)\) \{[\s\S]*?\}\r?\n  \};/, `const handleDeleteHR = async (hr: HR) => {
    const res = await Swal.fire({
      title: 'Delete HR?',
      text: \`Are you sure you want to delete \${hr.name}?\`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0755E8',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete',
    });
    if (res.isConfirmed) {
      const success = dataService.deleteHR(hr.id);
      if (success) {
        loadData();
        showToast('HR deleted successfully', 'success');
      } else {
        showToast('Failed to delete HR', 'error');
      }
    }
  };`);
  c = c.replace(/\{toast && \(\r?\n\s*<Toast[\s\S]*?\/>\r?\n\s*\)\}/, "");
  fs.writeFileSync(file, c, 'utf8');
  console.log('Updated HRManager.tsx');
}

// 3. InterviewsManager.tsx
{
  const file = path.join(__dirname, '../../client/src/components/InterviewsManager.tsx');
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/import Toast from '\.\/Toast';\r?\nimport { Toast as ToastType } from '\.\.\/types';/, "import Swal from 'sweetalert2';\nimport { toast } from 'sonner';");
  c = c.replace(/const \[toast, setToast\] = useState<ToastType \| null>\(null\);/, "");
  c = c.replace(/const showToast = \(message: string, type: ToastType\['type'\]\) => \{[\s\S]*?setToast\(\{[\s\S]*?\}\);\r?\n  \};/, `const showToast = (message: string, type: string) => {
    if (type === 'success') toast.success(message);
    else if (type === 'error') toast.error(message);
    else toast.info(message);
  };`);
  c = c.replace(/const handleDeleteInterview = \(interview: Interview\) => \{[\s\S]*?if \(window\.confirm\('Are you sure you want to delete this interview\?'\)\) \{[\s\S]*?\}\r?\n  \};/, `const handleDeleteInterview = async (interview: Interview) => {
    const res = await Swal.fire({
      title: 'Delete Interview?',
      text: 'Are you sure you want to delete this interview?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0755E8',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete',
    });
    if (res.isConfirmed) {
      const success = dataService.deleteInterview(interview.id);
      if (success) {
        loadData();
        showToast('Interview deleted successfully', 'success');
      } else {
        showToast('Failed to delete interview', 'error');
      }
    }
  };`);
  c = c.replace(/\{toast && \(\r?\n\s*<Toast[\s\S]*?\/>\r?\n\s*\)\}/, "");
  fs.writeFileSync(file, c, 'utf8');
  console.log('Updated InterviewsManager.tsx');
}

// 4. UserProfile.tsx
{
  const file = path.join(__dirname, '../../client/src/pages/UserProfile.tsx');
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes("import Swal from 'sweetalert2';")) {
    c = "import Swal from 'sweetalert2';\n" + c;
  }
  const tDel = 'if (!confirm("Are you sure you want to delete this resume?")) return;';
  const rDel = `const confirmDelete = await Swal.fire({
      title: "Delete Resume?",
      text: "Are you sure you want to delete this resume?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#0755E8",
      cancelButtonColor: "#ef4444",
      confirmButtonText: "Yes, delete",
    });
    if (!confirmDelete.isConfirmed) return;`;
  c = c.replace(tDel, rDel);
  fs.writeFileSync(file, c, 'utf8');
  console.log('Updated UserProfile.tsx');
}
