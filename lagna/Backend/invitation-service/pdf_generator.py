from io import BytesIO
from pathlib import Path

import qrcode
from pypdf import PdfReader, PdfWriter
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


BASE_DIR = Path(__file__).resolve().parent
ASSET_DIR = BASE_DIR / "assets"
FIXED_PDF = ASSET_DIR / "Invitation_fixed_optimized.pdf"
TEMPLATE_PDF = ASSET_DIR / "Invitation_template_optimized.pdf"
MM = 72 / 25.4
QR_BOX_SIZE = 34 * MM
# Measured from the QR-free page-4 template. The changemargin environment
# shifts the centered TikZ frame slightly right of the physical page center.
QR_BOX_X = 254.33
QR_BOX_Y = 132.72


def make_qr_image(data):
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=12,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)
    return qr.make_image(fill_color="#005F73", back_color="#FFF8E7").convert("RGB")


def build_overlay(qr_data, family_name, total_guests):
    packet = BytesIO()
    c = canvas.Canvas(packet, pagesize=A4)
    page_width, _ = A4
    box_x = QR_BOX_X
    box_y = QR_BOX_Y

    c.setFillColor(HexColor("#FFF8E7"))
    c.rect(
        box_x + (2.6 * MM),
        box_y + (2.6 * MM),
        QR_BOX_SIZE - (5.2 * MM),
        QR_BOX_SIZE - (5.2 * MM),
        fill=1,
        stroke=0,
    )

    qr_image = make_qr_image(qr_data)
    qr_size = 25 * MM
    c.drawImage(
        ImageReader(qr_image),
        box_x + (17 * MM) - (qr_size / 2),
        box_y + (18 * MM) - (qr_size / 2),
        width=qr_size,
        height=qr_size,
        mask="auto",
    )

    label = f"{family_name} Family"
    if total_guests:
        label += f" | {total_guests} guests"

    c.setFillColor(HexColor("#005F73"))
    c.setFont("Helvetica", 5.6)
    c.drawCentredString(box_x + (17 * MM), box_y + (4 * MM), label[:58])
    c.save()
    packet.seek(0)
    return PdfReader(packet).pages[0]


def generate_invitation_pdf(checkin_url, family_name, total_guests):
    fixed_reader = PdfReader(str(FIXED_PDF))
    template_reader = PdfReader(str(TEMPLATE_PDF))
    writer = PdfWriter()

    for page in fixed_reader.pages:
        writer.add_page(page)

    page4 = template_reader.pages[0]
    page4.merge_page(build_overlay(checkin_url, family_name, total_guests))
    writer.add_page(page4)

    output = BytesIO()
    writer.write(output)
    output.seek(0)
    return output
