declare module "qrcode" {
  type DataUrlOptions = {
    color?: {
      dark?: string;
      light?: string;
    };
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    margin?: number;
    width?: number;
  };

  const QRCode: {
    toDataURL(text: string, options?: DataUrlOptions): Promise<string>;
  };

  export default QRCode;
}
