using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using SpoolManager.Server.Domain.Entities;
using System.Text.Json;

namespace SpoolManager.Server.Domain
{
    public class SpoolManagerDbContext : IdentityDbContext<ApplicationUser>
    {
        public SpoolManagerDbContext(DbContextOptions options)
            : base(options)
        {
        }

        public DbSet<Brand> Brands => Set<Brand>();
        public DbSet<Filament> Filaments => Set<Filament>();
        public DbSet<Spool> Spools => Set<Spool>();
        public DbSet<PrintJob> PrintJobs => Set<PrintJob>();
        public DbSet<PrintJobSpool> PrintJobSpool => Set<PrintJobSpool>();
        public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<IdentityPasskeyData>(entity =>
            {
                entity.HasNoKey();

                entity.Property(p => p.Transports)
                    .HasConversion(
                        v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions)null),
                        v => System.Text.Json.JsonSerializer.Deserialize<string[]>(v, (System.Text.Json.JsonSerializerOptions)null) ?? Array.Empty<string>());
            });

            modelBuilder.Entity<RefreshToken>()
                .HasOne<ApplicationUser>()
                .WithMany()
                .HasForeignKey(r => r.UserId)
                .HasPrincipalKey(r => r.Id);

            modelBuilder.Entity<Filament>(entity =>
            {
                entity.Property(f => f.SettingsExtruderTemp)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions)null),
                    v => JsonSerializer.Deserialize<List<int>>(v, (JsonSerializerOptions)null) ?? new());

                entity.Property(f => f.SettingsBedTemp)
                    .HasConversion(
                        v => JsonSerializer.Serialize(v, (JsonSerializerOptions)null),
                        v => JsonSerializer.Deserialize<List<int>>(v, (JsonSerializerOptions)null) ?? new());
            });

            modelBuilder.Entity<PrintJobSpool>()
                .HasOne(pjf => pjf.PrintJob)
                .WithMany(pj => pj.PrintJobSpool)
                .HasForeignKey(pjf => pjf.PrintJobId);

            modelBuilder.Entity<PrintJobSpool>()
                .HasOne(pjf => pjf.Spool)
                .WithMany(f => f.PrintJobSpools)
                .HasForeignKey(pjf => pjf.SpoolId);
        }
    }
}
