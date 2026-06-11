<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Default.aspx.cs" Inherits="AnalizadorCuentaPuente.Default" %>

<!DOCTYPE html>
<html lang="es">
<head runat="server">
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Analizador Cuenta Puente - Conciliación</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { background: #f8f9fa; }
        .card-shadow { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .fila-verde { background-color: #d1e7dd !important; }
        .fila-roja { background-color: #f8d7da !important; font-weight: bold; }
        .monto-debito { color: #0d6efd; font-weight: 600; }
        .monto-credito { color: #dc3545; font-weight: 600; }
        .fila-verde { background-color: #d1e7dd !important; }
.fila-amarilla { background-color: #fff3cd !important; }
.fila-roja { background-color: #f8d7da !important; font-weight: bold; }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <div class="container py-4">
            <div class="card card-shadow mb-4">
                <div class="card-header bg-primary text-white">
                    <h3 class="mb-0">CONCILIADOR</h3>
                </div>
                <div class="card-body">
                    <p class="text-muted">Sube el archivo TXT exportado desde Open 4 Business. El sistema emparejará automáticamente Débitos contra Créditos del mismo monto.</p>
                    
                    <div class="row g-3 align-items-end">
                        <div class="col-md-8">
                            <asp:FileUpload ID="fuArchivo" runat="server" CssClass="form-control" accept=".txt" />
                        </div>
                        <div class="col-md-4">
                            <asp:Button ID="btnAnalizar" runat="server" Text="🔎 Emparejar y Analizar" OnClick="btnAnalizar_Click" CssClass="btn btn-primary w-100" />
                        </div>
                    </div>
                    
                    <asp:Label ID="lblMensaje" runat="server" CssClass="text-danger mt-2 d-block"></asp:Label>
                </div>
            </div>

            <asp:Panel ID="pnlResultados" runat="server" Visible="false">
                <asp:Literal ID="litEstado" runat="server"></asp:Literal>

                <div class="row g-3 mb-4">
                    <div class="col-md-4">
                        <div class="card text-white bg-success card-shadow">
                            <div class="card-body text-center">
                                <h5 class="card-title">TOTAL DÉBITOS</h5>
                                <h2 class="mb-0"><asp:Label ID="lblDebitos" runat="server"></asp:Label></h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card text-white bg-danger card-shadow">
                            <div class="card-body text-center">
                                <h5 class="card-title">TOTAL CRÉDITOS</h5>
                                <h2 class="mb-0"><asp:Label ID="lblCreditos" runat="server"></asp:Label></h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card text-white card-shadow" id="cardDiferencia" runat="server">
                            <div class="card-body text-center">
                                <h5 class="card-title">DIFERENCIA GLOBAL</h5>
                                <h2 class="mb-0"><asp:Label ID="lblDiferencia" runat="server"></asp:Label></h2>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card card-shadow">
                    <div class="card-header bg-dark text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Emparejamiento Débitos vs Créditos - Ordenado de Menor a Mayor (<asp:Label ID="lblTotalParejas" runat="server" ForeColor="Yellow"></asp:Label> parejas)</h5>
                        <span class="badge bg-info">📊 Orden: Monto Ascendente</span>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <asp:GridView ID="gvParejas" runat="server" AutoGenerateColumns="false"
                                CssClass="table table-hover mb-0" GridLines="None" 
                                OnRowDataBound="gvParejas_RowDataBound">
                                <HeaderStyle BackColor="#34495e" ForeColor="White" />
                                <Columns>
                                    <asp:BoundField DataField="FechaDebito" HeaderText="Fecha Débito" ItemStyle-Width="100px" />
                                    <asp:BoundField DataField="AsientoDebito" HeaderText="Asiento Débito" ItemStyle-Width="80px" />
                                    <asp:BoundField DataField="DescripcionDebito" HeaderText="Descripción Débito" />
                                    <asp:BoundField DataField="MontoDebito" HeaderText="Monto Débito" DataFormatString="{0:N2}" 
                                        ItemStyle-HorizontalAlign="Right" ItemStyle-Width="130px" ItemStyle-CssClass="monto-debito" />
                                    <asp:BoundField DataField="Diferencia" HeaderText="Diferencia" DataFormatString="{0:N2}" 
                                        ItemStyle-HorizontalAlign="Right" ItemStyle-Width="100px" />
                                    <asp:BoundField DataField="MontoCredito" HeaderText="Monto Crédito" DataFormatString="{0:N2}" 
                                        ItemStyle-HorizontalAlign="Right" ItemStyle-Width="130px" ItemStyle-CssClass="monto-credito" />
                                    <asp:BoundField DataField="DescripcionCredito" HeaderText="Descripción Crédito" />
                                    <asp:BoundField DataField="AsientoCredito" HeaderText="Asiento Crédito" ItemStyle-Width="80px" />
                                    <asp:BoundField DataField="FechaCredito" HeaderText="Fecha Crédito" ItemStyle-Width="100px" />
                                    <asp:BoundField DataField="Estado" HeaderText="Estado" ItemStyle-Width="150px" />
                                </Columns>
                            </asp:GridView>
                        </div>
                    </div>
                </div>
            </asp:Panel>
        </div>
    </form>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>