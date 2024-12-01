import jsPDF from 'jspdf'
import { AttendanceWithDates } from '@/lib/attendance'

// Constants for PDF layout
const PAGE_WIDTH = 330.2 // Legal Landscape width in mm (13 inches = 330.2mm)
const PAGE_HEIGHT = 215.9 // Legal Landscape height in mm (8.5 inches = 215.9mm)
const MARGIN = 12.7 // 0.5 inches in mm
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2)
const ROW_HEIGHT = 5 
const ROWS_PER_PAGE = 30
const HEADER_HEIGHT = 29
const TEXT_PADDING = 1
const PAGE_NUMBER_TOP_MARGIN = 0
const PAGE_NUMBER_LEFT_MARGIN = 0

export const downloadAttendanceTableAsPDF = async (attendances: AttendanceWithDates[]) => {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [330.2, 215.9]  // Philippine legal paper size
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

  const addTableHeaders = (startY: number) => {
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')

    const headers = [
      { text: 'Date', width: CONTENT_WIDTH * 0.08 },
      { text: 'Time', width: CONTENT_WIDTH * 0.06 },
      { text: 'Name', width: CONTENT_WIDTH * 0.18 },
      { text: 'Classification', width: CONTENT_WIDTH * 0.30 },
      { text: 'Purpose of Visit', width: CONTENT_WIDTH * 0.38 }
    ]

    let currentX = MARGIN
    headers.forEach(header => {
      pdf.rect(currentX, startY, header.width, ROW_HEIGHT)
      pdf.text(header.text, currentX + 2, startY + ROW_HEIGHT / 2 + TEXT_PADDING)
      currentX += header.width
    })

    return startY + ROW_HEIGHT
  }

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

      // Classification
      pdf.rect(currentX, currentY, CONTENT_WIDTH * 0.30, ROW_HEIGHT)
      pdf.text(record.classification, currentX + 2, currentY + ROW_HEIGHT / 2 + TEXT_PADDING)
      currentX += CONTENT_WIDTH * 0.30

      // Purpose
      pdf.rect(currentX, currentY, CONTENT_WIDTH * 0.38, ROW_HEIGHT)
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

