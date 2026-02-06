package com.eduvault.service;

import org.apache.poi.hslf.usermodel.HSLFSlideShow;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import fr.opensagres.poi.xwpf.converter.pdf.PdfConverter;
import fr.opensagres.poi.xwpf.converter.pdf.PdfOptions;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.hwpf.extractor.WordExtractor;

import java.awt.Color;
import java.awt.Dimension;
import java.awt.Graphics2D;
import java.awt.geom.Rectangle2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@Service
public class DocumentConversionService {

    private static final Logger logger = LoggerFactory.getLogger(DocumentConversionService.class);

    public byte[] convertPptToPdf(Path pptPath, String fileName) throws Exception {
        logger.info("Converting {} to PDF", fileName);
        
        try (InputStream is = Files.newInputStream(pptPath);
             PDDocument pdf = new PDDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            
            Dimension pgsize;
            List<?> slides;
            
            if (fileName.toLowerCase().endsWith(".pptx")) {
                XMLSlideShow ppt = new XMLSlideShow(is);
                pgsize = ppt.getPageSize();
                slides = ppt.getSlides();
            } else if (fileName.toLowerCase().endsWith(".ppt")) {
                HSLFSlideShow ppt = new HSLFSlideShow(is);
                pgsize = ppt.getPageSize();
                slides = ppt.getSlides();
            } else {
                throw new IllegalArgumentException("Unsupported file format: " + fileName);
            }
            
            logger.info("Found {} slides for {}", slides.size(), fileName);
            
            for (Object slideObj : slides) {
                BufferedImage img = new BufferedImage(pgsize.width, pgsize.height, BufferedImage.TYPE_INT_RGB);
                Graphics2D graphics = img.createGraphics();
                graphics.setPaint(Color.white);
                graphics.fill(new Rectangle2D.Float(0, 0, pgsize.width, pgsize.height));
                
                if (slideObj instanceof XSLFSlide) {
                    ((XSLFSlide) slideObj).draw(graphics);
                } else if (slideObj instanceof org.apache.poi.hslf.usermodel.HSLFSlide) {
                    ((org.apache.poi.hslf.usermodel.HSLFSlide) slideObj).draw(graphics);
                }
                
                PDPage page = new PDPage(new PDRectangle(pgsize.width, pgsize.height));
                pdf.addPage(page);
                
                PDImageXObject pdImage = LosslessFactory.createFromImage(pdf, img);
                try (PDPageContentStream contentStream = new PDPageContentStream(pdf, page)) {
                    contentStream.drawImage(pdImage, 0, 0, pgsize.width, pgsize.height);
                }
            }
            
            pdf.save(out);
            return out.toByteArray();
        } catch (Exception e) {
            logger.error("Error converting PPT to PDF: ", e);
            throw e;
        }
    }

    public byte[] convertDocxToPdf(Path docxPath) throws Exception {
        logger.info("Converting DOCX to PDF");
        try (InputStream is = Files.newInputStream(docxPath);
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            XWPFDocument document = new XWPFDocument(is);
            PdfOptions options = PdfOptions.create();
            PdfConverter.getInstance().convert(document, out, options);
            return out.toByteArray();
        } catch (Exception e) {
            logger.error("Error converting DOCX to PDF", e);
            throw e;
        }
    }

    public byte[] convertDocToPdf(Path docPath) throws Exception {
        logger.info("Converting DOC to plain-text PDF");
        try (InputStream is = Files.newInputStream(docPath);
             HWPFDocument document = new HWPFDocument(is);
             WordExtractor extractor = new WordExtractor(document);
             PDDocument pdf = new PDDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            
            String text = extractor.getText();
            String[] lines = text.split("\r?\n");
            
            PDPage page = new PDPage();
            pdf.addPage(page);
            PDPageContentStream contentStream = new PDPageContentStream(pdf, page);
            
            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            contentStream.setFont(font, 12);
            contentStream.beginText();
            contentStream.newLineAtOffset(50, 700);
            
            float yPos = 700;
            for (String line : lines) {
                // PDFBox doesn't support automatic wrapping or certain characters in basic fonts
                // Replace invalid characters to avoid errors
                line = line.replaceAll("[\\p{Cntrl}&&[^\r\n\t]]", "");
                line = line.replace('\t', ' ');
                
                try {
                    contentStream.showText(line.length() > 90 ? line.substring(0, 90) : line);
                } catch (Exception ignored) {}
                
                contentStream.newLineAtOffset(0, -15);
                yPos -= 15;
                
                if (yPos < 50) {
                    contentStream.endText();
                    contentStream.close();
                    
                    page = new PDPage();
                    pdf.addPage(page);
                    contentStream = new PDPageContentStream(pdf, page);
                    contentStream.setFont(font, 12);
                    contentStream.beginText();
                    contentStream.newLineAtOffset(50, 750);
                    yPos = 750;
                }
            }
            
            contentStream.endText();
            contentStream.close();
            
            pdf.save(out);
            return out.toByteArray();
        } catch (Exception e) {
            logger.error("Error converting DOC to PDF", e);
            throw e;
        }
    }
}
