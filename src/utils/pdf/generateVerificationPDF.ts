import { jsPDF } from 'jspdf';

interface VerificationData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: string;
  stripe_verification_status: string;
  phone_verification_status: string;
  stripe_verified_at: string | null;
  phone_verified_at: string | null;
  completed_at: string | null;
  created_at: string;
  organization?: {
    name: string;
  };
}

// Convert image to base64 for embedding in PDF
async function getLogoBase64(): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };
    img.onerror = reject;
    img.src = '/logoMain.png';
  });
}

export async function generateVerificationPDF(verification: VerificationData): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Colors
  const primaryColor: [number, number, number] = [16, 185, 129]; // Green-500
  const darkColor: [number, number, number] = [31, 41, 55]; // Gray-800
  const grayColor: [number, number, number] = [107, 114, 128]; // Gray-500
  const lightGray: [number, number, number] = [243, 244, 246]; // Gray-100

  let y = 15;

  // Try to add logo
  try {
    const logoBase64 = await getLogoBase64();
    doc.addImage(logoBase64, 'PNG', margin, y, 35, 23);
  } catch {
    // Fallback to text if logo fails to load
    doc.setFontSize(20);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('iOpes', margin, y + 10);
  }

  y += 28;

  // Header
  doc.setFontSize(20);
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Verification Certificate', margin, y);
  y += 7;

  // Subtitle
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'normal');
  doc.text('Identity & Phone Verification Complete', margin, y);
  y += 8;

  // Horizontal line
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Verification ID Box
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F');

  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'normal');
  doc.text('VERIFICATION ID', margin + 5, y + 6);

  doc.setFontSize(9);
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  doc.text(verification.id, margin + 5, y + 13);
  y += 25;

  // Customer Information Section
  doc.setFontSize(12);
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Customer Information', margin, y);
  y += 6;

  // Customer details box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 35, 2, 2, 'FD');

  const leftCol = margin + 5;
  const rightCol = pageWidth / 2 + 5;

  // Row 1: Name and Email
  let rowY = y + 8;
  doc.setFontSize(7);
  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'normal');
  doc.text('Full Name', leftCol, rowY);
  doc.text('Email Address', rightCol, rowY);

  rowY += 5;
  doc.setFontSize(9);
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  doc.text(`${verification.first_name} ${verification.last_name}`, leftCol, rowY);
  doc.setFont('helvetica', 'normal');
  doc.text(verification.email, rightCol, rowY);

  // Row 2: Phone and Organization
  rowY += 10;
  doc.setFontSize(7);
  doc.setTextColor(...grayColor);
  if (verification.phone) {
    doc.text('Phone Number', leftCol, rowY);
  }

  rowY += 5;
  doc.setFontSize(9);
  doc.setTextColor(...darkColor);
  if (verification.phone) {
    doc.text(verification.phone, leftCol, rowY);
  }


  y += 42;

  // Verification Status Section
  doc.setFontSize(12);
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Verification Status', margin, y);
  y += 6;

  // Status box with green background
  doc.setFillColor(236, 253, 245); // Green-50
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 32, 2, 2, 'FD');

  // Row 1: Identity and Phone status
  rowY = y + 8;
  doc.setFontSize(7);
  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'normal');
  doc.text('Identity Verification', leftCol, rowY);
  doc.text('Phone Verification', rightCol, rowY);

  rowY += 5;
  doc.setFontSize(10);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  const identityStatus = verification.stripe_verification_status === 'verified' ? 'Verified' : verification.stripe_verification_status;
  doc.text(identityStatus.charAt(0).toUpperCase() + identityStatus.slice(1), leftCol, rowY);
  const phoneStatus = verification.phone_verification_status === 'verified' ? 'Verified' : verification.phone_verification_status;
  doc.text(phoneStatus.charAt(0).toUpperCase() + phoneStatus.slice(1), rightCol, rowY);

  // Row 2: Overall Status
  rowY += 9;
  doc.setFontSize(7);
  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'normal');
  doc.text('Overall Status', leftCol, rowY);

  rowY += 5;
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPLETED', leftCol, rowY);

  y += 40;

  // Verification Timeline Section
  doc.setFontSize(12);
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Verification Timeline', margin, y);
  y += 6;

  // Timeline box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 35, 2, 2, 'FD');

  // Row 1: Created and Identity Verified
  rowY = y + 8;
  doc.setFontSize(7);
  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'normal');
  doc.text('Created', leftCol, rowY);
  if (verification.stripe_verified_at) {
    doc.text('Identity Verified', rightCol, rowY);
  }

  rowY += 5;
  doc.setFontSize(8);
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(verification.created_at).toLocaleString(), leftCol, rowY);
  if (verification.stripe_verified_at) {
    doc.text(new Date(verification.stripe_verified_at).toLocaleString(), rightCol, rowY);
  }

  // Row 2: Phone Verified and Completed
  rowY += 10;
  doc.setFontSize(7);
  doc.setTextColor(...grayColor);
  if (verification.phone_verified_at) {
    doc.text('Phone Verified', leftCol, rowY);
  }
  if (verification.completed_at) {
    doc.text('Completed', rightCol, rowY);
  }

  rowY += 5;
  doc.setFontSize(8);
  doc.setTextColor(...darkColor);
  if (verification.phone_verified_at) {
    doc.text(new Date(verification.phone_verified_at).toLocaleString(), leftCol, rowY);
  }
  if (verification.completed_at) {
    doc.text(new Date(verification.completed_at).toLocaleString(), rightCol, rowY);
  }

  y += 45;

  // Footer line
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Footer text
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.setFont('helvetica', 'normal');
  doc.text('This document certifies that the above individual has successfully completed', margin, y);
  y += 4;
  doc.text('identity and phone verification through iOpes verification services.', margin, y);
  y += 8;

  doc.setFontSize(7);
  doc.text(`Generated on ${new Date().toLocaleString()}`, margin, y);

  // Document ID in bottom right
  doc.setFontSize(6);
  doc.setTextColor(...grayColor);
  doc.text(`Document ID: ${verification.id}`, pageWidth - margin, pageHeight - 10, { align: 'right' });

  // Save the PDF
  const fileName = `verification-${verification.first_name.toLowerCase()}-${verification.last_name.toLowerCase()}-${verification.id.slice(0, 8)}.pdf`;
  doc.save(fileName);
}
