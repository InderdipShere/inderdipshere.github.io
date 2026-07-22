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
TEMPLATE_PDF = ASSET_DIR / "Invitation_template_groom_optimized.pdf"
BRIDE_TEMPLATE_PDF = ASSET_DIR / "Invitation_template_bride_optimized.pdf"
RICH_FIXED_PDF = ASSET_DIR / "Invitation_fixed.pdf"
RICH_TEMPLATE_PDF = ASSET_DIR / "Invitation_template_groom.pdf"
RICH_BRIDE_TEMPLATE_PDF = ASSET_DIR / "Invitation_template_bride.pdf"
MM = 72 / 25.4
QR_BOX_SIZE = 34 * MM
# Measured from the QR-free page-4 template. The changemargin environment
# shifts the centered TikZ frame slightly right of the physical page center.
QR_BOX_X = 254.33
QR_BOX_Y = 132.72
QR_CLEAN_MARGIN = 2.35 * MM
QR_BORDER_COVER_MARGIN = 4.0


def draw_favicon_mark(c, center_x, center_y):
    mark_size = 25 * MM
    mark_x = center_x - (mark_size / 2)
    mark_y = center_y - (mark_size / 2)

    c.setFillColor(HexColor("#3f2518"))
    c.roundRect(mark_x, mark_y, mark_size, mark_size, 10, fill=1, stroke=0)

    petal_color = HexColor("#ffd86b")
    c.setFillColor(petal_color)
    petal_radius = 4.1 * MM
    petal_distance = 6.8 * MM
    for dx, dy in (
        (0, petal_distance),
        (petal_distance, 0),
        (0, -petal_distance),
        (-petal_distance, 0),
        (petal_distance * 0.72, petal_distance * 0.72),
        (petal_distance * 0.72, -petal_distance * 0.72),
        (-petal_distance * 0.72, petal_distance * 0.72),
        (-petal_distance * 0.72, -petal_distance * 0.72),
    ):
        c.circle(center_x + dx, center_y + dy, petal_radius, fill=1, stroke=0)


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
    box_x = QR_BOX_X
    box_y = QR_BOX_Y

    c.setFillColor(HexColor("#FFF8E7"))

    if not qr_data:
        c.rect(
            box_x - QR_BORDER_COVER_MARGIN,
            box_y - QR_BORDER_COVER_MARGIN,
            QR_BOX_SIZE + (2 * QR_BORDER_COVER_MARGIN),
            QR_BOX_SIZE + (2 * QR_BORDER_COVER_MARGIN),
            fill=1,
            stroke=0,
        )
        draw_favicon_mark(c, box_x + (17 * MM), box_y + (17 * MM))
        c.save()
        packet.seek(0)
        return PdfReader(packet).pages[0]

    c.rect(
        box_x + QR_CLEAN_MARGIN,
        box_y + QR_CLEAN_MARGIN,
        QR_BOX_SIZE - (2 * QR_CLEAN_MARGIN),
        QR_BOX_SIZE - (2 * QR_CLEAN_MARGIN),
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


def is_bride_side(side):
    value = str(side or "").strip().lower()
    return any(marker in value for marker in ("bride", "wankhede", "वधू", "वधुपक्ष"))


def get_pdf_assets(quality="quick", side=""):
    if quality == "rich":
        return RICH_FIXED_PDF, RICH_BRIDE_TEMPLATE_PDF if is_bride_side(side) else RICH_TEMPLATE_PDF
    return FIXED_PDF, BRIDE_TEMPLATE_PDF if is_bride_side(side) else TEMPLATE_PDF


def generate_invitation_pdf(checkin_url, family_name, total_guests, quality="quick", side=""):
    fixed_pdf, template_pdf = get_pdf_assets(quality, side)
    fixed_reader = PdfReader(str(fixed_pdf))
    template_reader = PdfReader(str(template_pdf))
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
