// PDF Download Utility
// To enable PDF downloads, install html2pdf.js:
// npm install html2pdf.js

// @ts-ignore
import html2pdf from 'html2pdf.js';

export async function downloadResumePDF(
  resumeTemplate: HTMLElement | null,
  fileName: string = 'resume.pdf'
) {
  if (!resumeTemplate) {
    console.error('Template element not found');
    return;
  }

  const opt = {
    margin:       [0, 0, 0, 0],
    filename:     fileName,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { 
      scale: 2, 
      useCORS: true, 
      letterRendering: true,
      logging: false 
    },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  try {
    await html2pdf().from(resumeTemplate).set(opt).save();
  } catch (error) {
    console.error('PDF generation failed:', error);
    // Fallback to print
    printResume(resumeTemplate);
  }
}

export function printResume(resumeTemplate: HTMLElement | null) {
  if (!resumeTemplate) {
    console.error('Template element not found');
    return;
  }

  const printWindow = window.open('', '', 'height=600,width=800');
  if (printWindow) {
    printWindow.document.write('<html><head><title>Resume</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        margin: 0;
        padding: 0;
      }
      @media print {
        body {
          margin: 0;
          padding: 0;
        }
      }
    `);
    printWindow.document.write('</style></head><body>');
    printWindow.document.write(resumeTemplate.outerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}
