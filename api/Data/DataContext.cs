using System;
using api.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

#nullable disable

namespace api.Data
{
    public partial class DataContext : DbContext
    {
        public DataContext()
        {
        }

        public DataContext(DbContextOptions<DataContext> options)
            : base(options)
        {
        }

        public virtual DbSet<Comment> Comments { get; set; }
        public virtual DbSet<CompanyOption> CompanyOptions { get; set; }
        public virtual DbSet<Document> Documents { get; set; }
        public virtual DbSet<Employee> Employees { get; set; }
        public virtual DbSet<EmployeeInvoice> EmployeeInvoices { get; set; }
        public virtual DbSet<EmployeePermission> EmployeePermissions { get; set; }
        public virtual DbSet<EmployeeUser> EmployeeUsers { get; set; }
        public virtual DbSet<Expense> Expenses { get; set; }
        public virtual DbSet<Invoice> Invoices { get; set; }
        public virtual DbSet<Job> Jobs { get; set; }
        public virtual DbSet<Link> Links { get; set; }
        public virtual DbSet<ManagerEmployee> ManagerEmployees { get; set; }
        public virtual DbSet<Migration> Migrations { get; set; }
        public virtual DbSet<OauthAccessToken> OauthAccessTokens { get; set; }
        public virtual DbSet<OauthAuthCode> OauthAuthCodes { get; set; }
        public virtual DbSet<OauthClient> OauthClients { get; set; }
        public virtual DbSet<OauthPersonalAccessClient> OauthPersonalAccessClients { get; set; }
        public virtual DbSet<OauthRefreshToken> OauthRefreshTokens { get; set; }
        public virtual DbSet<Override> Overrides { get; set; }
        public virtual DbSet<PasswordReset> PasswordResets { get; set; }
        public virtual DbSet<Payroll> Payrolls { get; set; }
        public virtual DbSet<PayrollRestriction> PayrollRestrictions { get; set; }
        public virtual DbSet<Paystub> Paystubs { get; set; }
        public virtual DbSet<Permission> Permissions { get; set; }
        public virtual DbSet<PersonalAccessToken> PersonalAccessTokens { get; set; }
        public virtual DbSet<Post> Posts { get; set; }
        public virtual DbSet<TaggingTag> TaggingTags { get; set; }
        public virtual DbSet<TaggingTagGroup> TaggingTagGroups { get; set; }
        public virtual DbSet<TaggingTagged> TaggingTaggeds { get; set; }
        public virtual DbSet<Testimonial> Testimonials { get; set; }
        public virtual DbSet<TestimonialType> TestimonialTypes { get; set; }
        public virtual DbSet<User> Users { get; set; }
        public virtual DbSet<UserNotification> UserNotifications { get; set; }
        public virtual DbSet<Vendor> Vendors { get; set; }

        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            if (!optionsBuilder.IsConfigured)
            {
#warning To protect potentially sensitive information in your connection string, you should move it out of source code. You can avoid scaffolding the connection string by using the Name= syntax to read it from configuration - see https://go.microsoft.com/fwlink/?linkid=2131148. For more guidance on storing connection strings, see http://go.microsoft.com/fwlink/?LinkId=723263.
                optionsBuilder.UseMySQL("server=127.0.0.1;database=choice;uid=root;pwd=root;protocol=tcp");
            }
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Comment>(entity =>
            {
                entity.ToTable("comments");

                entity.HasIndex(e => e.FromUser, "comments_from_user_foreign");

                entity.HasIndex(e => e.OnPost, "comments_on_post_foreign");

                entity.Property(e => e.Id)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("id");

                entity.Property(e => e.Active).HasColumnName("active");

                entity.Property(e => e.Body)
                    .IsRequired()
                    .HasColumnName("body");

                entity.Property(e => e.FromUser)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("from_user");

                entity.Property(e => e.OnPost)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("on_post");

                entity.HasOne(d => d.FromUserNavigation)
                    .WithMany(p => p.Comments)
                    .HasForeignKey(d => d.FromUser)
                    .HasConstraintName("comments_from_user_foreign");

                entity.HasOne(d => d.OnPostNavigation)
                    .WithMany(p => p.Comments)
                    .HasForeignKey(d => d.OnPost)
                    .HasConstraintName("comments_on_post_foreign");
            });

            modelBuilder.Entity<CompanyOption>(entity =>
            {
                entity.ToTable("company_options");

                entity.Property(e => e.Id)
                    .HasColumnType("bigint(20) unsigned")
                    .HasColumnName("id");

                entity.Property(e => e.HasPaystubNotifications).HasColumnName("has_paystub_notifications");
            });

            modelBuilder.Entity<Document>(entity =>
            {
                entity.ToTable("documents");

                entity.Property(e => e.Id)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("id");

                entity.Property(e => e.Description)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("description");

                entity.Property(e => e.FilePath)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("file_path");

                entity.Property(e => e.MimeType)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("mime_type");

                entity.Property(e => e.Name)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("name");

                entity.Property(e => e.UploadedBy)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("uploaded_by");
            });

            modelBuilder.Entity<Employee>(entity =>
            {
                entity.ToTable("employees");

                entity.Property(e => e.Id)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("id");

                entity.Property(e => e.Address)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("address");

                entity.Property(e => e.Address2)
                    .HasMaxLength(255)
                    .HasColumnName("address_2")
                    .HasDefaultValueSql("'NULL'");

                entity.Property(e => e.City)
                    .HasMaxLength(255)
                    .HasColumnName("city")
                    .HasDefaultValueSql("'NULL'");

                entity.Property(e => e.Country)
                    .HasMaxLength(255)
                    .HasColumnName("country")
                    .HasDefaultValueSql("'NULL'");

                entity.Property(e => e.Email)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("email");

                entity.Property(e => e.HiddenPayroll).HasColumnName("hidden_payroll");

                entity.Property(e => e.IsActive).HasColumnName("is_active");

                entity.Property(e => e.IsAdmin).HasColumnName("is_admin");

                entity.Property(e => e.IsMgr).HasColumnName("is_mgr");

                entity.Property(e => e.Name)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("name");

                entity.Property(e => e.PhoneNo)
                    .HasMaxLength(13)
                    .HasColumnName("phone_no")
                    .HasDefaultValueSql("'NULL'");

                entity.Property(e => e.PostalCode)
                    .HasMaxLength(255)
                    .HasColumnName("postal_code")
                    .HasDefaultValueSql("'NULL'");

                entity.Property(e => e.SalesId1)
                    .IsRequired()
                    .HasMaxLength(15)
                    .HasColumnName("sales_id1")
                    .HasDefaultValueSql("'''0'''");

                entity.Property(e => e.SalesId2)
                    .IsRequired()
                    .HasMaxLength(15)
                    .HasColumnName("sales_id2")
                    .HasDefaultValueSql("'''0'''");

                entity.Property(e => e.SalesId3)
                    .IsRequired()
                    .HasMaxLength(15)
                    .HasColumnName("sales_id3")
                    .HasDefaultValueSql("'''0'''");

                entity.Property(e => e.State)
                    .HasMaxLength(255)
                    .HasColumnName("state")
                    .HasDefaultValueSql("'NULL'");
            });

            modelBuilder.Entity<EmployeeInvoice>(entity =>
            {
                entity.HasKey(e => new { e.EmployeeId, e.InvoiceId })
                    .HasName("PRIMARY");

                entity.ToTable("employee_invoice");

                entity.HasIndex(e => e.InvoiceId, "employee_invoice_invoice_id_foreign");

                entity.Property(e => e.EmployeeId)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("employee_id");

                entity.Property(e => e.InvoiceId)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("invoice_id");

                entity.HasOne(d => d.Employee)
                    .WithMany(p => p.EmployeeInvoices)
                    .HasForeignKey(d => d.EmployeeId)
                    .HasConstraintName("employee_invoice_employee_id_foreign");

                entity.HasOne(d => d.Invoice)
                    .WithMany(p => p.EmployeeInvoices)
                    .HasForeignKey(d => d.InvoiceId)
                    .HasConstraintName("employee_invoice_invoice_id_foreign");
            });

            modelBuilder.Entity<EmployeePermission>(entity =>
            {
                entity.HasKey(e => new { e.EmployeeId, e.PermissionId })
                    .HasName("PRIMARY");

                entity.ToTable("employee_permission");

                entity.HasIndex(e => e.PermissionId, "employee_permission_permission_id_foreign");

                entity.Property(e => e.EmployeeId)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("employee_id");

                entity.Property(e => e.PermissionId)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("permission_id");

                entity.HasOne(d => d.Employee)
                    .WithMany(p => p.EmployeePermissions)
                    .HasForeignKey(d => d.EmployeeId)
                    .HasConstraintName("employee_permission_employee_id_foreign");

                entity.HasOne(d => d.Permission)
                    .WithMany(p => p.EmployeePermissions)
                    .HasForeignKey(d => d.PermissionId)
                    .HasConstraintName("employee_permission_permission_id_foreign");
            });

            modelBuilder.Entity<EmployeeUser>(entity =>
            {
                entity.HasKey(e => new { e.EmployeeId, e.UserId })
                    .HasName("PRIMARY");

                entity.ToTable("employee_user");

                entity.HasIndex(e => e.UserId, "employee_user_user_id_foreign");

                entity.Property(e => e.EmployeeId)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("employee_id");

                entity.Property(e => e.UserId)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("user_id");

                entity.HasOne(d => d.Employee)
                    .WithMany(p => p.EmployeeUsers)
                    .HasForeignKey(d => d.EmployeeId)
                    .HasConstraintName("employee_user_employee_id_foreign");

                entity.HasOne(d => d.User)
                    .WithMany(p => p.EmployeeUsers)
                    .HasForeignKey(d => d.UserId)
                    .HasConstraintName("employee_user_user_id_foreign");
            });

            modelBuilder.Entity<Expense>(entity =>
            {
                entity.HasKey(e => e.Expid)
                    .HasName("PRIMARY");

                entity.ToTable("expenses");

                entity.Property(e => e.Expid)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("expid");

                entity.Property(e => e.Agentid)
                    .HasColumnType("int(11)")
                    .HasColumnName("agentid");

                entity.Property(e => e.Amount)
                    .HasColumnType("decimal(19,4)")
                    .HasColumnName("amount");

                entity.Property(e => e.IssueDate)
                    .HasColumnType("date")
                    .HasColumnName("issue_date");

                entity.Property(e => e.Notes)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("notes");

                entity.Property(e => e.Type)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("type");

                entity.Property(e => e.VendorId)
                    .HasColumnType("int(11)")
                    .HasColumnName("vendor_id")
                    .HasDefaultValueSql("'1'");

                entity.Property(e => e.Wkending)
                    .HasColumnType("date")
                    .HasColumnName("wkending");
            });

            modelBuilder.Entity<Invoice>(entity =>
            {
                entity.ToTable("invoices");

                entity.Property(e => e.InvoiceId)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("invoice_id");

                entity.Property(e => e.Address)
                    .IsRequired()
                    .HasMaxLength(200)
                    .HasColumnName("address");

                entity.Property(e => e.Agentid)
                    .HasColumnType("int(11)")
                    .HasColumnName("agentid");

                entity.Property(e => e.Amount)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("amount")
                    .HasDefaultValueSql("''''''");

                entity.Property(e => e.City)
                    .IsRequired()
                    .HasMaxLength(200)
                    .HasColumnName("city");

                entity.Property(e => e.FirstName)
                    .IsRequired()
                    .HasMaxLength(60)
                    .HasColumnName("first_name");

                entity.Property(e => e.IssueDate)
                    .HasColumnType("date")
                    .HasColumnName("issue_date");

                entity.Property(e => e.LastName)
                    .IsRequired()
                    .HasMaxLength(60)
                    .HasColumnName("last_name");

                entity.Property(e => e.SaleDate)
                    .HasColumnType("date")
                    .HasColumnName("sale_date");

                entity.Property(e => e.Status)
                    .IsRequired()
                    .HasColumnType("mediumtext")
                    .HasColumnName("status");

                entity.Property(e => e.Vendor)
                    .IsRequired()
                    .HasMaxLength(200)
                    .HasColumnName("vendor");

                entity.Property(e => e.Wkending)
                    .HasColumnType("date")
                    .HasColumnName("wkending");
            });

            modelBuilder.Entity<Job>(entity =>
            {
                entity.ToTable("jobs");

                entity.HasIndex(e => e.Queue, "jobs_queue_index");

                entity.Property(e => e.Id)
                    .HasColumnType("bigint(20) unsigned")
                    .HasColumnName("id");

                entity.Property(e => e.Attempts)
                    .HasColumnType("tinyint(3) unsigned")
                    .HasColumnName("attempts");

                entity.Property(e => e.AvailableAt)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("available_at");

                entity.Property(e => e.CreatedAt)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("created_at");

                entity.Property(e => e.Payload)
                    .IsRequired()
                    .HasColumnType("longtext")
                    .HasColumnName("payload");

                entity.Property(e => e.Queue)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("queue");

                entity.Property(e => e.ReservedAt)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("reserved_at")
                    .HasDefaultValueSql("'NULL'");
            });

            modelBuilder.Entity<Link>(entity =>
            {
                entity.ToTable("links");

                entity.Property(e => e.Id)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("id");

                entity.Property(e => e.Name)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("name");
            });

            modelBuilder.Entity<ManagerEmployee>(entity =>
            {
                entity.ToTable("manager_employees");

                entity.HasIndex(e => e.EmployeeId, "manager_employees_employee_id_foreign");

                entity.HasIndex(e => e.ManagerId, "manager_employees_manager_id_foreign");

                entity.Property(e => e.Id)
                    .HasColumnType("bigint(20) unsigned")
                    .HasColumnName("id");

                entity.Property(e => e.EmployeeId)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("employee_id");

                entity.Property(e => e.ManagerId)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("manager_id");

                entity.HasOne(d => d.Employee)
                    .WithMany(p => p.ManagerEmployeeEmployees)
                    .HasForeignKey(d => d.EmployeeId)
                    .OnDelete(DeleteBehavior.ClientSetNull)
                    .HasConstraintName("manager_employees_employee_id_foreign");

                entity.HasOne(d => d.Manager)
                    .WithMany(p => p.ManagerEmployeeManagers)
                    .HasForeignKey(d => d.ManagerId)
                    .OnDelete(DeleteBehavior.ClientSetNull)
                    .HasConstraintName("manager_employees_manager_id_foreign");
            });

            modelBuilder.Entity<Migration>(entity =>
            {
                entity.HasNoKey();

                entity.ToTable("migrations");

                entity.Property(e => e.Batch)
                    .HasColumnType("int(11)")
                    .HasColumnName("batch");

                entity.Property(e => e.Migration1)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("migration");
            });

            modelBuilder.Entity<OauthAccessToken>(entity =>
            {
                entity.ToTable("oauth_access_tokens");

                entity.HasIndex(e => e.UserId, "oauth_access_tokens_user_id_index");

                entity.Property(e => e.Id)
                    .HasMaxLength(100)
                    .HasColumnName("id");

                entity.Property(e => e.ClientId)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("client_id");

                entity.Property(e => e.ExpiresAt)
                    .HasColumnName("expires_at")
                    .HasDefaultValueSql("'NULL'");

                entity.Property(e => e.Name)
                    .HasMaxLength(255)
                    .HasColumnName("name")
                    .HasDefaultValueSql("'NULL'");

                entity.Property(e => e.Revoked).HasColumnName("revoked");

                entity.Property(e => e.Scopes)
                    .HasColumnName("scopes")
                    .HasDefaultValueSql("'NULL'");

                entity.Property(e => e.UserId)
                    .HasColumnType("bigint(20)")
                    .HasColumnName("user_id")
                    .HasDefaultValueSql("'NULL'");
            });

            modelBuilder.Entity<OauthAuthCode>(entity =>
            {
                entity.ToTable("oauth_auth_codes");

                entity.Property(e => e.Id)
                    .HasMaxLength(100)
                    .HasColumnName("id");

                entity.Property(e => e.ClientId)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("client_id");

                entity.Property(e => e.ExpiresAt)
                    .HasColumnName("expires_at")
                    .HasDefaultValueSql("'NULL'");

                entity.Property(e => e.Revoked).HasColumnName("revoked");

                entity.Property(e => e.Scopes)
                    .HasColumnName("scopes")
                    .HasDefaultValueSql("'NULL'");

                entity.Property(e => e.UserId)
                    .HasColumnType("bigint(20)")
                    .HasColumnName("user_id");
            });

            modelBuilder.Entity<OauthClient>(entity =>
            {
                entity.ToTable("oauth_clients");

                entity.HasIndex(e => e.UserId, "oauth_clients_user_id_index");

                entity.Property(e => e.Id)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("id");

                entity.Property(e => e.Name)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("name");

                entity.Property(e => e.PasswordClient).HasColumnName("password_client");

                entity.Property(e => e.PersonalAccessClient).HasColumnName("personal_access_client");

                entity.Property(e => e.Redirect)
                    .IsRequired()
                    .HasColumnName("redirect");

                entity.Property(e => e.Revoked).HasColumnName("revoked");

                entity.Property(e => e.Secret)
                    .HasMaxLength(100)
                    .HasColumnName("secret")
                    .HasDefaultValueSql("'NULL'");

                entity.Property(e => e.UserId)
                    .HasColumnType("bigint(20)")
                    .HasColumnName("user_id")
                    .HasDefaultValueSql("'NULL'");
            });

            modelBuilder.Entity<OauthPersonalAccessClient>(entity =>
            {
                entity.ToTable("oauth_personal_access_clients");

                entity.HasIndex(e => e.ClientId, "oauth_personal_access_clients_client_id_index");

                entity.Property(e => e.Id)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("id");

                entity.Property(e => e.ClientId)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("client_id");
            });

            modelBuilder.Entity<OauthRefreshToken>(entity =>
            {
                entity.ToTable("oauth_refresh_tokens");

                entity.HasIndex(e => e.AccessTokenId, "oauth_refresh_tokens_access_token_id_index");

                entity.Property(e => e.Id)
                    .HasMaxLength(100)
                    .HasColumnName("id");

                entity.Property(e => e.AccessTokenId)
                    .IsRequired()
                    .HasMaxLength(100)
                    .HasColumnName("access_token_id");

                entity.Property(e => e.ExpiresAt)
                    .HasColumnName("expires_at")
                    .HasDefaultValueSql("'NULL'");

                entity.Property(e => e.Revoked).HasColumnName("revoked");
            });

            modelBuilder.Entity<Override>(entity =>
            {
                entity.HasKey(e => e.Ovrid)
                    .HasName("PRIMARY");

                entity.ToTable("overrides");

                entity.Property(e => e.Ovrid)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("ovrid");

                entity.Property(e => e.Agentid)
                    .HasColumnType("int(11)")
                    .HasColumnName("agentid");

                entity.Property(e => e.Commission)
                    .HasColumnType("decimal(19,4)")
                    .HasColumnName("commission");

                entity.Property(e => e.IssueDate)
                    .HasColumnType("date")
                    .HasColumnName("issue_date");

                entity.Property(e => e.Name)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("name");

                entity.Property(e => e.Sales)
                    .HasColumnType("int(11)")
                    .HasColumnName("sales");

                entity.Property(e => e.Total)
                    .HasColumnType("decimal(19,4)")
                    .HasColumnName("total");

                entity.Property(e => e.VendorId)
                    .HasColumnType("int(11)")
                    .HasColumnName("vendor_id")
                    .HasDefaultValueSql("'1'");

                entity.Property(e => e.Wkending)
                    .HasColumnType("date")
                    .HasColumnName("wkending");
            });

            modelBuilder.Entity<PasswordReset>(entity =>
            {
                entity.HasNoKey();

                entity.ToTable("password_resets");

                entity.HasIndex(e => e.Email, "password_resets_email_index");

                entity.HasIndex(e => e.Token, "password_resets_token_index");

                entity.Property(e => e.Email)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("email");

                entity.Property(e => e.Token)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("token");
            });

            modelBuilder.Entity<Payroll>(entity =>
            {
                entity.ToTable("payroll");

                entity.Property(e => e.Id)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("id");

                entity.Property(e => e.AgentId)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("agent_id");

                entity.Property(e => e.AgentName)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("agent_name");

                entity.Property(e => e.Amount)
                    .HasColumnType("decimal(19,4)")
                    .HasColumnName("amount");

                entity.Property(e => e.IsPaid).HasColumnName("is_paid");

                entity.Property(e => e.PayDate)
                    .HasColumnType("date")
                    .HasColumnName("pay_date");

                entity.Property(e => e.VendorId)
                    .HasColumnType("int(11)")
                    .HasColumnName("vendor_id")
                    .HasDefaultValueSql("'1'");
            });

            modelBuilder.Entity<PayrollRestriction>(entity =>
            {
                entity.ToTable("payroll_restriction");

                entity.Property(e => e.Id)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("id");

                entity.Property(e => e.Hour)
                    .HasColumnType("int(11)")
                    .HasColumnName("hour");

                entity.Property(e => e.Minute)
                    .HasColumnType("int(11)")
                    .HasColumnName("minute");

                entity.Property(e => e.ModifiedBy)
                    .HasColumnType("int(11)")
                    .HasColumnName("modified_by");
            });

            modelBuilder.Entity<Paystub>(entity =>
            {
                entity.ToTable("paystubs");

                entity.HasIndex(e => new { e.AgentId, e.IssueDate, e.VendorId }, "paystubs_agent_id_issue_date_vendor_id_unique")
                    .IsUnique();

                entity.Property(e => e.Id)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("id");

                entity.Property(e => e.AgentId)
                    .HasColumnType("int(11)")
                    .HasColumnName("agent_id");

                entity.Property(e => e.AgentName)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("agent_name");

                entity.Property(e => e.Amount)
                    .HasColumnType("decimal(19,4)")
                    .HasColumnName("amount");

                entity.Property(e => e.IssueDate)
                    .HasColumnType("date")
                    .HasColumnName("issue_date");

                entity.Property(e => e.ModifiedBy)
                    .HasColumnType("int(11)")
                    .HasColumnName("modified_by");

                entity.Property(e => e.VendorId)
                    .HasColumnType("int(11)")
                    .HasColumnName("vendor_id");

                entity.Property(e => e.VendorName)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("vendor_name");

                entity.Property(e => e.WeekendDate)
                    .HasColumnType("date")
                    .HasColumnName("weekend_date");
            });

            modelBuilder.Entity<Permission>(entity =>
            {
                entity.ToTable("permissions");

                entity.HasIndex(e => e.EmpId, "permissions_emp_id_unique")
                    .IsUnique();

                entity.Property(e => e.Id)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("id");

                entity.Property(e => e.EmpId)
                    .HasColumnType("int(11)")
                    .HasColumnName("emp_id");

                entity.Property(e => e.IsActive).HasColumnName("is_active");
            });

            modelBuilder.Entity<PersonalAccessToken>(entity =>
            {
                entity.ToTable("personal_access_tokens");

                entity.HasIndex(e => e.Token, "personal_access_tokens_token_unique")
                    .IsUnique();

                entity.HasIndex(e => new { e.TokenableType, e.TokenableId }, "personal_access_tokens_tokenable_type_tokenable_id_index");

                entity.Property(e => e.Id)
                    .HasColumnType("bigint(20) unsigned")
                    .HasColumnName("id");

                entity.Property(e => e.Abilities)
                    .HasColumnName("abilities")
                    .HasDefaultValueSql("'NULL'");

                entity.Property(e => e.Name)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("name");

                entity.Property(e => e.Token)
                    .IsRequired()
                    .HasMaxLength(64)
                    .HasColumnName("token");

                entity.Property(e => e.TokenableId)
                    .HasColumnType("bigint(20) unsigned")
                    .HasColumnName("tokenable_id");

                entity.Property(e => e.TokenableType)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("tokenable_type");
            });

            modelBuilder.Entity<Post>(entity =>
            {
                entity.ToTable("posts");

                entity.HasIndex(e => e.AuthorId, "posts_author_id_foreign");

                entity.HasIndex(e => e.Slug, "posts_slug_unique")
                    .IsUnique();

                entity.HasIndex(e => e.Title, "posts_title_unique")
                    .IsUnique();

                entity.Property(e => e.Id)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("id");

                entity.Property(e => e.Active).HasColumnName("active");

                entity.Property(e => e.AuthorId)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("author_id");

                entity.Property(e => e.Body)
                    .IsRequired()
                    .HasColumnName("body");

                entity.Property(e => e.Slug)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("slug");

                entity.Property(e => e.Title)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("title");

                entity.HasOne(d => d.Author)
                    .WithMany(p => p.Posts)
                    .HasForeignKey(d => d.AuthorId)
                    .HasConstraintName("posts_author_id_foreign");
            });

            modelBuilder.Entity<TaggingTag>(entity =>
            {
                entity.ToTable("tagging_tags");

                entity.HasIndex(e => e.Slug, "tagging_tags_slug_index");

                entity.HasIndex(e => e.TagGroupId, "tagging_tags_tag_group_id_foreign");

                entity.Property(e => e.Id)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("id");

                entity.Property(e => e.Count)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("count");

                entity.Property(e => e.Name)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("name");

                entity.Property(e => e.Slug)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("slug");

                entity.Property(e => e.Suggest).HasColumnName("suggest");

                entity.Property(e => e.TagGroupId)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("tag_group_id")
                    .HasDefaultValueSql("'NULL'");

                entity.HasOne(d => d.TagGroup)
                    .WithMany(p => p.TaggingTags)
                    .HasForeignKey(d => d.TagGroupId)
                    .HasConstraintName("tagging_tags_tag_group_id_foreign");
            });

            modelBuilder.Entity<TaggingTagGroup>(entity =>
            {
                entity.ToTable("tagging_tag_groups");

                entity.HasIndex(e => e.Slug, "tagging_tag_groups_slug_index");

                entity.Property(e => e.Id)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("id");

                entity.Property(e => e.Name)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("name");

                entity.Property(e => e.Slug)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("slug");
            });

            modelBuilder.Entity<TaggingTagged>(entity =>
            {
                entity.ToTable("tagging_tagged");

                entity.HasIndex(e => e.TagSlug, "tagging_tagged_tag_slug_index");

                entity.HasIndex(e => e.TaggableId, "tagging_tagged_taggable_id_index");

                entity.HasIndex(e => e.TaggableType, "tagging_tagged_taggable_type_index");

                entity.Property(e => e.Id)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("id");

                entity.Property(e => e.TagName)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("tag_name");

                entity.Property(e => e.TagSlug)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("tag_slug");

                entity.Property(e => e.TaggableId)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("taggable_id");

                entity.Property(e => e.TaggableType)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("taggable_type");
            });

            modelBuilder.Entity<Testimonial>(entity =>
            {
                entity.ToTable("testimonials");

                entity.Property(e => e.Id)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("id");

                entity.Property(e => e.Content)
                    .IsRequired()
                    .HasColumnName("content");

                entity.Property(e => e.Location)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("location");

                entity.Property(e => e.TestimonialType)
                    .HasColumnType("int(11)")
                    .HasColumnName("testimonial_type");
            });

            modelBuilder.Entity<TestimonialType>(entity =>
            {
                entity.ToTable("testimonial_types");

                entity.Property(e => e.Id)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("id");

                entity.Property(e => e.Name)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("name");

                entity.Property(e => e.Type)
                    .HasColumnType("int(11)")
                    .HasColumnName("type");
            });

            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Uid)
                    .HasName("PRIMARY");

                entity.ToTable("users");

                entity.HasIndex(e => e.Email, "users_email_unique")
                    .IsUnique();

                entity.Property(e => e.Uid)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("uid");

                entity.Property(e => e.Email)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("email");

                entity.Property(e => e.Id)
                    .HasColumnType("int(11)")
                    .HasColumnName("id");

                entity.Property(e => e.Name)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("name");

                entity.Property(e => e.Password)
                    .IsRequired()
                    .HasMaxLength(255)
                    .HasColumnName("password");

                entity.Property(e => e.RememberToken)
                    .HasMaxLength(100)
                    .HasColumnName("remember_token")
                    .HasDefaultValueSql("'NULL'");

                entity.Property(e => e.Role)
                    .IsRequired()
                    .HasColumnType("enum('admin','author','subscriber')")
                    .HasColumnName("role")
                    .HasDefaultValueSql("'''author'''");
            });

            modelBuilder.Entity<UserNotification>(entity =>
            {
                entity.ToTable("user_notifications");

                entity.HasIndex(e => e.EmployeeId, "user_notifications_employee_id_foreign");

                entity.HasIndex(e => e.UserId, "user_notifications_user_id_foreign");

                entity.Property(e => e.Id)
                    .HasColumnType("bigint(20) unsigned")
                    .HasColumnName("id");

                entity.Property(e => e.EmployeeId)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("employee_id");

                entity.Property(e => e.HasPaystubNotifier).HasColumnName("has_paystub_notifier");

                entity.Property(e => e.NotifierDestination)
                    .HasMaxLength(255)
                    .HasColumnName("notifier_destination")
                    .HasDefaultValueSql("'NULL'");

                entity.Property(e => e.PaystubNotifierType)
                    .HasColumnType("tinyint(3) unsigned")
                    .HasColumnName("paystub_notifier_type")
                    .HasDefaultValueSql("'NULL'");

                entity.Property(e => e.UserId)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("user_id");

                entity.HasOne(d => d.Employee)
                    .WithMany(p => p.UserNotifications)
                    .HasForeignKey(d => d.EmployeeId)
                    .OnDelete(DeleteBehavior.ClientSetNull)
                    .HasConstraintName("user_notifications_employee_id_foreign");

                entity.HasOne(d => d.User)
                    .WithMany(p => p.UserNotifications)
                    .HasForeignKey(d => d.UserId)
                    .OnDelete(DeleteBehavior.ClientSetNull)
                    .HasConstraintName("user_notifications_user_id_foreign");
            });

            modelBuilder.Entity<Vendor>(entity =>
            {
                entity.ToTable("vendors");

                entity.Property(e => e.Id)
                    .HasColumnType("int(10) unsigned")
                    .HasColumnName("id");

                entity.Property(e => e.IsActive)
                    .HasColumnType("tinyint(4)")
                    .HasColumnName("is_active");

                entity.Property(e => e.Name)
                    .IsRequired()
                    .HasMaxLength(300)
                    .HasColumnName("name");
            });

            OnModelCreatingPartial(modelBuilder);
        }

        partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
    }
}
