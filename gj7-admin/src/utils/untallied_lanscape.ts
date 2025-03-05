// untallied_lanscape.ts

import jsPDF from 'jspdf'
import { AttendanceWithDates } from '@/types/attendance'
import { SchoolAccountsApi } from '@/lib/school_accounts'

// Constants for PDF layout
const PAGE_WIDTH = 330.2 
const PAGE_HEIGHT = 215.9 
const MARGIN = 12.7 
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2)
const ROW_HEIGHT = 5 
const HEADER_ROW_HEIGHT = 10 // Increased header row height
const ROWS_PER_PAGE = 30
const HEADER_HEIGHT = 29
const TEXT_PADDING = 1
const PAGE_NUMBER_TOP_MARGIN = 0
const PAGE_NUMBER_LEFT_MARGIN = 0

export const downloadAttendanceTableAsPDF = async (attendances: AttendanceWithDates[]) => {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [330.2, 215.9]  
  })

  const addHeader = (pageNumber: number, totalPages: number) => {
    pdf.addImage('/attendance_records_header.png', 'PNG', MARGIN, MARGIN, CONTENT_WIDTH, 20)
    
    pdf.setFontSize(10)
    pdf.text(
      `Updated Daily Record of Library Users SY: 2024-2025 ${new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).replace(/\b\w/g, l => l.toUpperCase())}`,
      PAGE_WIDTH / 2,
      MARGIN + 25,
      { align: 'center' }
    )

    pdf.text(
      `Page ${pageNumber} of ${totalPages}`,
      PAGE_WIDTH - MARGIN + PAGE_NUMBER_LEFT_MARGIN,
      PAGE_HEIGHT - MARGIN + PAGE_NUMBER_TOP_MARGIN,
      { align: 'right' }
    )
  }

  // Fetch unique courses dynamically
  const accounts = await SchoolAccountsApi.getAllSchoolAccounts();
  const courses = SchoolAccountsApi.extractUniqueCourses(accounts);

  console.log("Fetched unique courses:", courses);

  const addTableHeaders = (startY: number) => {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
  
    const baseHeaders = [
      { text: 'Date', width: CONTENT_WIDTH * 0.08 },
      { text: 'Time', width: CONTENT_WIDTH * 0.06 },
      { text: 'Name', width: CONTENT_WIDTH * 0.18 },
    ];
  
    const courseHeaders = courses.map(course => ({
      text: course,
      width: (CONTENT_WIDTH * 0.30) / courses.length
    }));
  
    const purposeHeader = {
      text: 'Purpose of Visit',
      width: CONTENT_WIDTH * 0.32
    };
  
    const headers = [...baseHeaders, ...courseHeaders, purposeHeader];
  
    let currentX = MARGIN;
    headers.forEach((header, index) => {
      pdf.rect(currentX, startY, header.width, HEADER_ROW_HEIGHT);
      
      // Vertical text for course headers
      if (index >= 3 && index < headers.length - 1) {
        const letters = header.text.split('').filter(letter => letter !== '-');
        const columnMidY = startY + (HEADER_ROW_HEIGHT / 2);
        const letterHeight = 3; // Height of each letter
        const totalLetterHeight = letters.length * letterHeight;
        const startLetterY = columnMidY - (totalLetterHeight / 2) + (letterHeight / 2);

        letters.forEach((letter, letterIndex) => {
          pdf.text(
            letter, 
            currentX + (header.width / 2), 
            startLetterY + (letterIndex * letterHeight), 
            { 
              align: 'center',
              baseline: 'middle'
            }
          );
        });
      } else {
        // Horizontal text for base headers and purpose
        pdf.text(header.text, 
          currentX + (header.width / 2), 
          startY + (HEADER_ROW_HEIGHT / 2), 
          { 
            align: 'center',
            baseline: 'middle'
          }
        );
      }
      
      currentX += header.width;
    });
  
    return startY + HEADER_ROW_HEIGHT;
  };

  const totalPages = Math.ceil(attendances.length / ROWS_PER_PAGE)

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (pageNum > 1) pdf.addPage()

    addHeader(pageNum, totalPages)

    let currentY = MARGIN + HEADER_HEIGHT
    currentY = addTableHeaders(currentY)

    const startIndex = (pageNum - 1) * ROWS_PER_PAGE
    const pageRecords = attendances.slice(startIndex, startIndex + ROWS_PER_PAGE)

    pdf.setFont('helvetica', 'normal')
    pageRecords.forEach((record) => {
      let currentX = MARGIN

      // Date
      pdf.rect(currentX, currentY, CONTENT_WIDTH * 0.08, ROW_HEIGHT)
      pdf.text(record.time_in_date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).replace(/\b\w/g, l => l.toUpperCase()), currentX + 2, currentY + ROW_HEIGHT / 2 + TEXT_PADDING)
      currentX += CONTENT_WIDTH * 0.08

      // Time
      pdf.rect(currentX, currentY, CONTENT_WIDTH * 0.06, ROW_HEIGHT)
      pdf.text(
        record.time_in_date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        currentX + 2,
        currentY + ROW_HEIGHT / 2 + TEXT_PADDING
      )
      currentX += CONTENT_WIDTH * 0.06

      // Name
      pdf.rect(currentX, currentY, CONTENT_WIDTH * 0.18, ROW_HEIGHT)
      pdf.text(
        record.full_name.replace(/\b\w+/g, word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ), 
        currentX + 2, 
        currentY + ROW_HEIGHT / 2 + TEXT_PADDING
      )
      currentX += CONTENT_WIDTH * 0.18

      // Course columns
      courses.forEach(course => {
        const isChecked = record.classification === course;
        const colWidth = (CONTENT_WIDTH * 0.30) / courses.length;
        
        pdf.rect(currentX, currentY, colWidth, ROW_HEIGHT);
        if (isChecked) {
          pdf.setTextColor(0, 0, 0);
          pdf.text('✔', currentX + colWidth / 2, currentY + ROW_HEIGHT / 2 + TEXT_PADDING, { align: 'center' });
        } else {
          pdf.setTextColor(255, 255, 255); // White color
          pdf.text('❌', currentX + colWidth / 2, currentY + ROW_HEIGHT / 2 + TEXT_PADDING, { align: 'center' });
          pdf.setTextColor(0, 0, 0);
        }
        currentX += colWidth;
      });

      // Purpose
      pdf.rect(currentX, currentY, CONTENT_WIDTH * 0.32, ROW_HEIGHT)
      pdf.text(record.purpose_label || 'N/A', currentX + 2, currentY + ROW_HEIGHT / 2 + TEXT_PADDING)

      currentY += ROW_HEIGHT
    })

    if (pageNum === totalPages) {
      currentY += ROW_HEIGHT
      pdf.setFont('helvetica', 'bold')
      pdf.text(`Total Visitors: ${attendances.length}`, MARGIN + 2, currentY + ROW_HEIGHT / 2 + TEXT_PADDING)
    }
  }

  pdf.save('attendance_records.pdf')
}