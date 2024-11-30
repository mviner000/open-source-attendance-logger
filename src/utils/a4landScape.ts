import jsPDF from 'jspdf'
import { AttendanceWithDates } from '@/lib/attendance'

// Constants for PDF layout
const PAGE_WIDTH = 297 // A4 Landscape width in mm
const PAGE_HEIGHT = 210 // A4 Landscape height in mm
const MARGIN = 10
const ROW_HEIGHT = 5 
const ROWS_PER_PAGE = 30
const HEADER_HEIGHT = 29
const PAGE_NUMBER_TOP_MARGIN = 0
const PAGE_NUMBER_LEFT_MARGIN = 0
const TEXT_PADDING = 1

export const downloadAttendanceTableAsPDF = async (attendances: AttendanceWithDates[]) => {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  })

  const addHeader = (pageNumber: number, totalPages: number) => {
    pdf.addImage('/attendance_records_header.png', 'PNG', MARGIN, MARGIN - 5, PAGE_WIDTH - (MARGIN * 2), 20) // Reduced top margin by 5mm
    
    pdf.setFontSize(10)
    pdf.text(
      `Updated Daily Record of Library Users SY: 2024-2025 ${new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).replace(/\b\w/g, l => l.toUpperCase())}`,
      PAGE_WIDTH / 2,
      MARGIN + 21,
      { align: 'center' }
    )

    pdf.text(
      `Page ${pageNumber} of ${totalPages}`,
      PAGE_WIDTH - MARGIN - PAGE_NUMBER_LEFT_MARGIN,
      PAGE_HEIGHT - MARGIN - PAGE_NUMBER_TOP_MARGIN,
      { align: 'right' }
    )
  }

  const addTableHeaders = (startY: number) => {
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'bold')

    const headers = [
      { text: 'Date', width: 25 },
      { text: 'Time', width: 20 },
      { text: 'Name', width: 60 },
      { text: 'Classification', width: 100 },
      { text: 'Purpose of Visit', width: 72 }
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
      pdf.rect(currentX, currentY, 25, ROW_HEIGHT)
      pdf.text(record.time_in_date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).replace(/\b\w/g, l => l.toUpperCase()), currentX + 2, currentY + ROW_HEIGHT / 2 + TEXT_PADDING)
      currentX += 25

      // Time
      pdf.rect(currentX, currentY, 20, ROW_HEIGHT)
      pdf.text(
        record.time_in_date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        currentX + 2,
        currentY + ROW_HEIGHT / 2 + TEXT_PADDING
      )
      currentX += 20

      // Name
      pdf.rect(currentX, currentY, 60, ROW_HEIGHT)
      pdf.text(
        record.full_name.replace(/\b\w+/g, word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ), 
        currentX + 2, 
        currentY + ROW_HEIGHT / 2 + TEXT_PADDING
      )
      currentX += 60

      // Classification
      pdf.rect(currentX, currentY, 100, ROW_HEIGHT)
      pdf.text(record.classification, currentX + 2, currentY + ROW_HEIGHT / 2 + TEXT_PADDING)
      currentX += 100

      // Purpose
      pdf.rect(currentX, currentY, 72, ROW_HEIGHT)
      pdf.text(record.purpose_label || 'N/A', currentX + 2, currentY + ROW_HEIGHT / 2 + TEXT_PADDING)

      currentY += ROW_HEIGHT
    })

    if (pageNum === totalPages) {
      currentY += ROW_HEIGHT
      pdf.setFont('helvetica', 'bold')
      pdf.text(`Total Visitors: ${attendances.length}`, MARGIN, currentY + ROW_HEIGHT / 2 + TEXT_PADDING)
    }
  }

  pdf.save('attendance_records.pdf')
}

