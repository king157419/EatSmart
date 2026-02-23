import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * 将 DOM 元素导出为 PNG 图片
 */
export async function exportToImage(element: HTMLElement, filename: string = 'recipe'): Promise<void> {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    console.error('导出图片失败:', error);
    throw error;
  }
}

/**
 * 将 DOM 元素导出为 PDF
 */
export async function exportToPDF(element: HTMLElement, filename: string = 'recipe'): Promise<void> {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgWidth = 210; // A4 宽度 (mm)
    const pageHeight = 297; // A4 高度 (mm)
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF('p', 'mm', 'a4');
    let heightLeft = imgHeight;
    let position = 0;

    // 添加图片到 PDF
    pdf.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      0,
      position,
      imgWidth,
      imgHeight
    );
    heightLeft -= pageHeight;

    // 如果内容超过一页，添加更多页
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        0,
        position,
        imgWidth,
        imgHeight
      );
      heightLeft -= pageHeight;
    }

    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('导出PDF失败:', error);
    throw error;
  }
}
