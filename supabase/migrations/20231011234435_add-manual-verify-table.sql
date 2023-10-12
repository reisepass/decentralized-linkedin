create table
    public.manual_review_inbox (
                                   id bigint generated by default as identity,
                                   cid character varying not null,
                                   account character varying not null,
                                   media_type character varying not null,
                                   fulfilled boolean not null,
                                   created_at timestamp with time zone not null default now(),
                                   constraint manual_review_inbox_pkey primary key (id)
) tablespace pg_default;

CREATE UNIQUE INDEX manual_review_inbox_cid_account_media_type_idx
    ON public.manual_review_inbox USING btree
    (cid COLLATE pg_catalog."default", account COLLATE pg_catalog."default")
    TABLESPACE pg_default;